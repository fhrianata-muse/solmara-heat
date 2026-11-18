// main.js — SOLMARA HEAT: boot, input, the game loop, menus and the mission flow.
// Mara Voss runs 7 courier jobs across Solmara Bay on foot and in stolen cars,
// under a 1–5 star wanted system, with a synth radio in her ears and a save
// file that remembers the money. ?shot=<scene>&seed=N stages a screenshot.

import { createWorld } from './gameworld.js';
import { stageShot } from './shots.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { collideBuildings } from './city.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
// LOOK.md render finish: ACES tone mapping, sRGB output, soft shadows.
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function resize(world) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
}

/** ---- Screenshot mode: stage, render twice, signal readiness. ---- */
function runShot(name) {
  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  const world = stageShot(name, seed, renderer);
  window.__world = world;
  resize(world);
  const hud = new Hud(); hud.show();
  const state = hudState(world);
  hud.update(0, state);
  let painted = 0;
  function paint() {
    renderer.render(world.scene, world.camera);
    hud.update(0, hudState(world));
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else {
      // Renderer diagnostics for the scorecard's performance row.
      window.__diagnostics = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function hudState(world) {
  const p = world.player;
  return {
    cash: world.cash, stars: world.wanted.stars,
    banner: world.missions.banner(),
    jobFraction: world.missions.phase === 'deliver' && world.missions.job
      ? world.missions.timer / world.missions.job.time : null,
    target: world.missions.target,
    player: p.pos, heading: p.car ? p.car.heading : p.camHeading,
    speed: p.speed, inCar: !!p.car,
    police: world.police.cruisers, traffic: world.traffic.cars,
  };
}

/** ---- Live game ---- */
function runGame() {
  const world = createWorld(seed, renderer);
  window.__world = world;
  const hud = new Hud();
  const audio = new GameAudio();
  const keys = {};
  let paused = false, started = false, saveTimer = 0, mouseDown = false;

  const saved = loadSave();
  if (saved) {
    world.cash = saved.cash;
    world.missions.index = Math.min(saved.jobsDone, 7);
    if (saved.jobsDone >= 7) world.missions.phase = 'done';
    world.player.x = saved.x; world.player.z = saved.z;
    document.getElementById('continueNote').textContent =
      `Save found: $${saved.cash.toLocaleString('en-US')}, ${saved.jobsDone}/7 jobs done — START continues Mara's story.`;
  }
  resize(world);
  window.addEventListener('resize', () => resize(world));
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && started) togglePause();
    if (e.code === 'KeyM' && started) hud.toast(audio.toggleRadio() ? '📻 Radio ON — Solmara Sun FM' : '📻 Radio off');
    if (e.code === 'KeyE' && started && !paused) toggleCar();
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousedown', () => { mouseDown = true; });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  function togglePause() {
    paused = !paused;
    document.getElementById('pauseMenu').classList.toggle('hidden', !paused);
    if (paused) document.getElementById('pauseStats').textContent =
      `Cash $${world.cash.toLocaleString('en-US')} · Jobs done ${world.missions.index}/7 · Wanted ${world.wanted.stars}★`;
  }
  function toggleCar() {
    const p = world.player;
    if (p.car) { p.exitCar(); hud.toast('On foot'); return; }
    const car = world.nearestEnterableCar(p.x, p.z);
    if (!car) { hud.toast('No car in reach — walk to one and press E'); return; }
    const wasParked = world.parked.includes(car) || car === world.playerCar;
    p.enterCar(car);
    if (!wasParked || car !== world.playerCar) { if (car !== world.playerCar) { world.wanted.crime(25); hud.toast('🚗 Car stolen! The PD noticed…'); } }
    if (car === world.playerCar) hud.toast('Your coupe — let\'s roll');
    audio.pickup();
  }

  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startMenu').classList.add('hidden');
    hud.show(); started = true; audio.start();
    hud.toast('Welcome to Solmara Bay, Mara. Find the gold marker!', 4);
  });
  document.getElementById('resumeBtn').addEventListener('click', togglePause);

  let last = performance.now(), accumulator = 0;
  const STEP = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (!started || paused) { renderer.render(world.scene, world.camera); return; }
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      stepWorld(STEP);
    }
    world.player.updateCamera(world.camera, dt);
    hud.update(dt, hudState(world));
    renderer.render(world.scene, world.camera);
  }

  function stepWorld(dt) {
    const p = world.player;
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (p.car) {
      p.car.drive(dt, {
        throttle: fwd, steer: strafe * 0.9,
        boost: !!(keys.ShiftLeft || keys.ShiftRight), brake: !!keys.Space,
      }, world.city.colliders, collideBuildings);
      if (p.car.bumped) {
        p.car.bumped = false; world.wanted.crime(6);
        p.addTrauma(0.5); // game-feel large tier: the hit lands in the camera
        world.effects.dust(p.car.x, 0.8, p.car.z);
      }
    } else {
      p.walk(dt, {
        x: strafe, z: fwd, sprint: !!(keys.ShiftLeft || keys.ShiftRight),
        camLeft: !!keys.KeyQ, camRight: !!keys.KeyR,
      }, world.city.colliders);
    }
    const firing = !!(keys.KeyF || mouseDown);
    p.aiming = firing && !p.car;
    if (firing) {
      const origin = p.pos;
      const h = p.car ? p.car.heading : p.heading;
      world.combat.fire({ x: origin.x, z: origin.z }, { x: Math.sin(h), z: Math.cos(h) },
        world.pedestrians, world.allCars(), world.wanted, audio);
    }
    const hidden = Math.abs(p.speed) < 1 && world.police.cruisers.length === 0;
    world.wanted.update(dt, hidden);
    world.simulate(dt, null);
    const event = world.missions.update(dt, p.pos, world.wanted);
    if (event === 'brief') { hud.toast('📦 Job taken — reach the pickup!', 3); audio.pickup(); }
    if (event === 'pickup') { hud.toast('🚨 Cargo aboard — deliver it before the timer dies!', 3); }
    if (event === 'failed') { hud.toast('⌛ Too slow — the job is gone. Take the next one.', 3.4); audio.fail(); }
    if (event && event.startsWith('paid:')) {
      const pay = Number(event.slice(5));
      world.cash += pay; audio.paid();
      hud.toast(`💰 Job done! +$${pay.toLocaleString('en-US')} — ${world.missions.index}/7 jobs complete`, 3.6);
      storeSave({ cash: world.cash, jobsDone: world.missions.index, x: p.pos.x, z: p.pos.z });
      if (world.missions.phase === 'done') hud.toast('🏆 STORY COMPLETE! Mara cleared her brother\'s name.', 6);
    }
    saveTimer += dt;
    if (saveTimer > 6) { saveTimer = 0; storeSave({ cash: world.cash, jobsDone: world.missions.index, x: p.pos.x, z: p.pos.z }); }
    audio.update(dt, p.speed, world.wanted.stars);
  }
  world.player.updateCamera(world.camera, 1);
  requestAnimationFrame(frame);
}

if (shotName) runShot(shotName);
else runGame();
