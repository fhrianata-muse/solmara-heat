// gameworld.js — assembles Solmara Bay: renderer scene, city, traffic,
// pedestrians, police, missions, combat and Mara. Shared by the live game
// (main.js) and the deterministic screenshot scenes (shots.js), so a staged
// frame is the real world, simulated forward — never a fake picture.

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
  // The LOOK.md light preset, moved as a unit: gradient sky dome, warm sun
  // with fitted shadows, hemisphere fill, PMREM environment from the same
  // sky, and pale horizon fog far enough to frame — never hide — the city.
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(760, 24, 12),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(skyDome);
  scene.fog = new THREE.Fog(0xcfe8f2, 240, 720);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 340 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xbfe3f2, 0xe8d9b0, 0.5));
  if (renderer) {
    // Image-based light from the painted sky itself, so paint and glass
    // reflect the same sky the player sees.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide })));
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }
  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);
  camera.position.set(0, 4, -10);

  const rand = seededRandom(seed * 7919 + 13);
  const city = createCity(scene, seed);
  const traffic = new Traffic(scene, rand, 15);
  const pedestrians = new Pedestrians(scene, rand, 26);
  const parked = spawnParkedCars(scene, rand);
  const playerCar = new Car(scene, -5.5, 147.5, 0.5, HERO_COLOR, 'coupe'); // Mara's coral coupe, in reach of her spawn
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
    /** Cars Mara may enter: parked, traffic, or her own — nearest within range. */
    nearestEnterableCar(x, z, maxDist = 4.6) {
      let best = null, bd = maxDist;
      for (const car of this.allCars()) {
        if (car.dead || car.occupied) continue;
        const d = Math.hypot(car.x - x, car.z - z);
        if (d < bd) { bd = d; best = car; }
      }
      return best;
    },
    /** One simulation step of everything except Mara's own input handling. */
    simulate(dt, danger) {
      this.time += dt;
      // The shadow frustum follows Mara: one tight 2048 map on the play
      // area beats a soft city-wide one. The sea sparkle scrolls, boats bob.
      const t = this.player.pos;
      sun.position.set(t.x + 55, 95, t.z + 40);
      sun.target.position.set(t.x, 0, t.z);
      sun.target.updateMatrixWorld();
      if (oceanMaterial.map) {
        oceanMaterial.map.offset.set((this.time * 0.003) % 1, (this.time * 0.009) % 1);
      }
      this.city.boats.forEach((b, i) => {
        b.position.y = 0.3 + Math.sin(this.time * 0.9 + i * 1.7) * 0.07;
        b.rotation.z = Math.sin(this.time * 0.7 + i * 2.3) * 0.02;
      });
      this.traffic.update(dt);
      this.pedestrians.update(dt, danger || this.combat.lastShotAt);
      const target = this.player.pos;
      this.police.update(dt, this.wanted.stars, target, this.city.colliders);
      this.combat.update(dt);
      // Every car lays skid marks through the one effects hook.
      for (const car of this.allCars()) if (!car.onSkid) car.onSkid = (x, z, h) => this.effects.skid(x, z, h);
      this.effects.update(dt);
      // Bump pedestrians if a driven car ploughs through them (slow speed only tips them).
      for (const car of this.allCars()) {
        if (Math.abs(car.speed) < 4) continue;
        const p = this.pedestrians.nearest(car.x, car.z, 1.7);
        if (p) {
          this.pedestrians.knockDown(p); this.wanted.crime(26);
          this.effects.dust(p.x, 0.7, p.z);
          if (car === this.player.car) this.player.addTrauma(0.35);
        }
      }
    },
  };
  // Balance pass: the PMREM sky is generous, so matte surfaces take reduced
  // env intensity — otherwise sun + hemisphere + env stack into a pale wash
  // and the deco palette loses saturation. Paint, glass and chrome keep
  // their own higher settings from materials.js. Cruisers spawn later with
  // shared materials, so the clamp holds for them too.
  scene.traverse((o) => {
    if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) {
      o.material.envMapIntensity = 0.45;
    }
  });
  return world;
}
