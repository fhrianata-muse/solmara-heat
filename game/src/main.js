// main.js — boot, input, the fixed-step game loop, menus and mission flow.
//
// Two modes share this file. Live play: a start menu over a real world, WASD
// to walk and drive, E to steal cars, F to fire, Esc to pause, and a save
// written as Mara earns. Screenshot mode (?shot=<scene>&seed=N): stage one
// deterministic scene (shots.js), paint it three times, publish renderer
// diagnostics, and raise window.__shotReady for the capture harness.

import { createWorld } from './gameworld.js';
import { stageShot } from './shots.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { collideBuildings } from './city.js';

const query = new URLSearchParams(window.location.search);
const shotScene = query.get('shot');
const seedArg = Number.parseInt(query.get('seed') ?? '', 10);
const seed = Number.isInteger(seedArg) ? seedArg : 7;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
// The render finish LOOK.md prescribes: ACES, sRGB out, soft shadows.
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function fitToWindow(world) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
}

/** Everything the HUD needs for one frame, gathered in one place. */
function hudSnapshot(world) {
  const p = world.player;
  return {
    cash: world.cash,
    stars: world.wanted.stars,
    banner: world.missions.banner(),
    jobFraction: world.missions.phase === 'deliver' && world.missions.job
      ? world.missions.timer / world.missions.job.time
      : null,
    target: world.missions.target,
    player: p.pos,
    heading: p.car ? p.car.heading : p.camHeading,
    speed: p.speed,
    inCar: !!p.car,
    police: world.police.cruisers,
    traffic: world.traffic.cars,
  };
}

/** ---- Screenshot mode ---- */
function runShotScene(name) {
  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  const world = stageShot(name, seed, renderer);
  window.__world = world;
  fitToWindow(world);
  const hud = new Hud();
  hud.show();
  hud.update(0, hudSnapshot(world));
  let paints = 0;
  const paint = () => {
    renderer.render(world.scene, world.camera);
    hud.update(0, hudSnapshot(world));
    paints += 1;
    if (paints < 3) requestAnimationFrame(paint);
    else {
      window.__diagnostics = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
      window.__shotReady = true;
    }
  };
  requestAnimationFrame(paint);
}

/** ---- Live play ---- */
function runGame() {
  const world = createWorld(seed, renderer);
  window.__world = world;
  const hud = new Hud();
  const audio = new GameAudio();
  const keys = {};
  let paused = false, started = false, mouseHeld = false, autosaveClock = 0;

  // A returning Mara keeps her money, her place in the story, her corner.
  const save = loadSave();
  if (save) {
    world.cash = save.cash;
    world.missions.index = Math.min(save.jobsDone, 7);
    if (save.jobsDone >= 7) world.missions.phase = 'done';
    world.player.x = save.x;
    world.player.z = save.z;
    document.getElementById('continueNote').textContent =
      `Save found: $${save.cash.toLocaleString('en-US')}, ${save.jobsDone}/7 jobs done — START continues Mara's story.`;
  }
  fitToWindow(world);
  window.addEventListener('resize', () => fitToWindow(world));

  const togglePause = () => {
    paused = !paused;
    document.getElementById('pauseMenu').classList.toggle('hidden', !paused);
    if (paused) {
      document.getElementById('pauseStats').textContent =
        `Cash $${world.cash.toLocaleString('en-US')} · Jobs done ${world.missions.index}/7 · Wanted ${world.wanted.stars}★`;
    }
  };
  const getInOrOut = () => {
    const p = world.player;
    if (p.car) {
      p.exitCar();
      hud.toast('On foot');
      return;
    }
    const car = world.nearestEnterableCar(p.x, p.z);
    if (!car) {
      hud.toast('No car in reach — walk to one and press E');
      return;
    }
    const hers = car === world.playerCar;
    p.enterCar(car);
    if (hers) hud.toast('Your coupe — let\'s roll');
    else {
      world.wanted.crime(25);
      hud.toast('🚗 Car stolen! The PD noticed…');
    }
    audio.pickup();
  };

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && started) togglePause();
    if (e.code === 'KeyM' && started) hud.toast(audio.toggleRadio() ? '📻 Radio ON — Solmara Sun FM' : '📻 Radio off');
    if (e.code === 'KeyE' && started && !paused) getInOrOut();
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousedown', () => { mouseHeld = true; });
  window.addEventListener('mouseup', () => { mouseHeld = false; });

  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startMenu').classList.add('hidden');
    hud.show();
    started = true;
    audio.start();
    hud.toast('Welcome to Solmara Bay, Mara. Find the gold marker!', 4);
  });
  document.getElementById('resumeBtn').addEventListener('click', togglePause);

  const STEP = 1 / 60;
  let lastStamp = performance.now(), accumulator = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastStamp) / 1000, 0.1);
    lastStamp = now;
    if (!started || paused) {
      renderer.render(world.scene, world.camera);
      return;
    }
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      stepOnce(STEP);
    }
    world.player.updateCamera(world.camera, dt);
    hud.update(dt, hudSnapshot(world));
    renderer.render(world.scene, world.camera);
  };

  const persist = () => storeSave({
    cash: world.cash, jobsDone: world.missions.index,
    x: world.player.pos.x, z: world.player.pos.z,
  });

  function stepOnce(dt) {
    const p = world.player;
    const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (p.car) {
      p.car.drive(dt, {
        throttle: forward,
        steer: strafe * 0.9,
        boost: !!(keys.ShiftLeft || keys.ShiftRight),
        brake: !!keys.Space,
      }, world.city.colliders, collideBuildings);
      if (p.car.bumped) {
        p.car.bumped = false;
        world.wanted.crime(6);
        p.addTrauma(0.5); // game-feel large tier: the hit lands in the camera
        world.effects.dust(p.car.x, 0.8, p.car.z);
      }
    } else {
      p.walk(dt, {
        x: strafe, z: forward,
        sprint: !!(keys.ShiftLeft || keys.ShiftRight),
        camLeft: !!keys.KeyQ, camRight: !!keys.KeyR,
      }, world.city.colliders);
    }

    const firing = !!(keys.KeyF || mouseHeld);
    p.aiming = firing && !p.car;
    if (firing) {
      const origin = p.pos;
      const heading = p.car ? p.car.heading : p.heading;
      world.combat.fire({ x: origin.x, z: origin.z },
        { x: Math.sin(heading), z: Math.cos(heading) },
        world.pedestrians, world.allCars(), world.wanted, audio);
    }

    const lyingLow = Math.abs(p.speed) < 1 && world.police.cruisers.length === 0;
    world.wanted.update(dt, lyingLow);
    world.simulate(dt, null);

    const event = world.missions.update(dt, p.pos, world.wanted);
    if (event === 'brief') {
      hud.toast('📦 Job taken — reach the pickup!', 3);
      audio.pickup();
    } else if (event === 'pickup') {
      hud.toast('🚨 Cargo aboard — deliver it before the timer dies!', 3);
      world.effects.celebrate(p.pos.x, 1, p.pos.z); // the marker answers back
    } else if (event === 'failed') {
      hud.toast('⌛ Too slow — the job is gone. Take the next one.', 3.4);
      audio.fail();
    } else if (event && event.startsWith('paid:')) {
      const pay = Number(event.slice(5));
      world.cash += pay;
      audio.paid();
      world.effects.celebrate(p.pos.x, 1, p.pos.z);
      hud.toast(`💰 Job done! +$${pay.toLocaleString('en-US')} — ${world.missions.index}/7 jobs complete`, 3.6);
      persist();
      if (world.missions.phase === 'done') {
        hud.toast('🏆 STORY COMPLETE! Mara cleared her brother\'s name.', 6);
      }
    }

    autosaveClock += dt;
    if (autosaveClock > 6) {
      autosaveClock = 0;
      persist();
    }
    audio.update(dt, p.speed, world.wanted.stars);
  }

  world.player.updateCamera(world.camera, 1);
  requestAnimationFrame(frame);
}

if (shotScene) runShotScene(shotScene);
else runGame();
