// gameworld.js — one factory for the whole living world: scene, the LOOK.md
// light preset, city, traffic, pedestrians, parked cars, police, missions,
// combat, effects and Mara herself. The live game (main.js) and the staged
// screenshot scenes (shots.js) both build their world here, so a screenshot
// is the real game simulated forward — never a posed fake.

import { createCity, seededRandom, oceanMaterial } from './city.js';
import { skyTexture } from './materials.js';
import { Car, spawnParkedCars, HERO_COLOR } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police, Wanted } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Player } from './player.js';
import { Effects } from './effects.js';

export function createWorld(seed = 7, renderer = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  // --- The light preset, applied as one unit (LOOK.md / threejs-scene) ---
  // Gradient sky dome; warm sun with a shadow frustum that follows Mara;
  // hemisphere fill; a PMREM environment baked from the same painted sky so
  // paint and glass reflect what the player sees; pale horizon fog placed
  // far enough to frame the skyline, never to hide missing geometry.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(760, 24, 12),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(dome);
  scene.fog = new THREE.Fog(0xcfe8f2, 240, 720);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 340 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xbfe3f2, 0xe8d9b0, 0.5));

  if (renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide })));
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }

  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);
  camera.position.set(0, 4, -10);

  // --- The cast and systems ---
  const rand = seededRandom(seed * 7919 + 13);
  const city = createCity(scene, seed);
  const traffic = new Traffic(scene, rand, 15);
  const pedestrians = new Pedestrians(scene, rand, 26);
  const parked = spawnParkedCars(scene, rand);
  const playerCar = new Car(scene, -5.5, 147.5, 0.5, HERO_COLOR, 'coupe'); // Mara's coupe, steps from her spawn
  const police = new Police(scene);
  const wanted = new Wanted();
  const missions = new Missions(scene);
  const effects = new Effects(scene);
  const combat = new Combat(scene, effects);
  const player = new Player(scene, -2, 144);

  const world = {
    scene, camera, sun, city, traffic, pedestrians, parked, playerCar,
    police, wanted, missions, combat, player, effects,
    cash: 120, time: 0,

    allCars() {
      return [...this.parked, ...this.traffic.cars, ...this.police.cruisers, this.playerCar];
    },

    /** The nearest car Mara may enter (parked, traffic, or her own). */
    nearestEnterableCar(x, z, maxDist = 4.6) {
      let best = null, bestD = maxDist;
      for (const car of this.allCars()) {
        if (car.dead || car.occupied) continue;
        const d = Math.hypot(car.x - x, car.z - z);
        if (d < bestD) { bestD = d; best = car; }
      }
      return best;
    },

    /** One step of everything except Mara's own input handling. */
    simulate(dt, danger) {
      this.time += dt;
      // The shadow frustum rides with Mara: one tight 2048 map over the
      // play area beats a soft city-wide one.
      const focus = this.player.pos;
      sun.position.set(focus.x + 55, 95, focus.z + 40);
      sun.target.position.set(focus.x, 0, focus.z);
      sun.target.updateMatrixWorld();
      // The sea sparkle scrolls; the marina boats bob and roll gently.
      if (oceanMaterial.map) {
        oceanMaterial.map.offset.set((this.time * 0.003) % 1, (this.time * 0.009) % 1);
      }
      this.city.boats.forEach((boat, i) => {
        boat.position.y = 0.3 + Math.sin(this.time * 0.9 + i * 1.7) * 0.07;
        boat.rotation.z = Math.sin(this.time * 0.7 + i * 2.3) * 0.02;
      });
      this.traffic.update(dt);
      this.pedestrians.update(dt, danger || this.combat.lastShotAt);
      this.police.update(dt, this.wanted.stars, this.player.pos, this.city.colliders);
      this.combat.update(dt);
      // Every car lays skid marks through the one effects hook.
      for (const car of this.allCars()) {
        if (!car.onSkid) car.onSkid = (x, z, h) => this.effects.skid(x, z, h);
      }
      this.effects.update(dt);
      // A driven car that ploughs into a pedestrian tips them over — and
      // the PD notices. At crawl speed nothing happens.
      for (const car of this.allCars()) {
        if (Math.abs(car.speed) < 4) continue;
        const victim = this.pedestrians.nearest(car.x, car.z, 1.7);
        if (victim) {
          this.pedestrians.knockDown(victim);
          this.wanted.crime(26);
          this.effects.dust(victim.x, 0.7, victim.z);
          if (car === this.player.car) this.player.addTrauma(0.35);
        }
      }
    },
  };

  // Balance rule: the PMREM sky is generous, so matte surfaces take a
  // reduced env intensity — otherwise sun + hemisphere + env stack into a
  // pale wash and the deco palette loses saturation. Paint, glass and
  // chrome set their own intensities in materials.js and keep them (the
  // clamp only touches materials still at the default of 1).
  scene.traverse((obj) => {
    if (obj.material && obj.material.isMeshStandardMaterial && obj.material.envMapIntensity === 1) {
      obj.material.envMapIntensity = 0.45;
    }
  });
  return world;
}
