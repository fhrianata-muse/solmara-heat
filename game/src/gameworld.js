// gameworld.js — assembles Solmara Bay: renderer scene, city, traffic,
// pedestrians, police, missions, combat and Mara. Shared by the live game
// (main.js) and the deterministic screenshot scenes (shots.js), so a staged
// frame is the real world, simulated forward — never a fake picture.

import { createCity, seededRandom } from './city.js';
import { Car, spawnParkedCars } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police, Wanted } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Player } from './player.js';

export function createWorld(seed = 7) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xa8d8f0, 190, 560);
  const sun = new THREE.DirectionalLight(0xfff2cf, 1.05);
  sun.position.set(60, 120, 80); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xcfeeff, 0xffe0b0, 0.85));
  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);
  camera.position.set(0, 4, -10);

  const rand = seededRandom(seed * 7919 + 13);
  const city = createCity(scene, seed);
  const traffic = new Traffic(scene, rand, 15);
  const pedestrians = new Pedestrians(scene, rand, 26);
  const parked = spawnParkedCars(scene, rand);
  const playerCar = new Car(scene, -5.5, 147.5, 0.5, 0xffb340); // Mara's own coupe, in reach of her spawn
  const police = new Police(scene);
  const wanted = new Wanted();
  const missions = new Missions(scene);
  const combat = new Combat(scene);
  const player = new Player(scene, -2, 144);

  const world = {
    scene, camera, city, traffic, pedestrians, parked, playerCar,
    police, wanted, missions, combat, player,
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
      this.traffic.update(dt);
      this.pedestrians.update(dt, danger || this.combat.lastShotAt);
      const target = this.player.pos;
      this.police.update(dt, this.wanted.stars, target, this.city.colliders);
      this.combat.update(dt);
      // Bump pedestrians if a driven car ploughs through them (slow speed only tips them).
      for (const car of this.allCars()) {
        if (Math.abs(car.speed) < 4) continue;
        const p = this.pedestrians.nearest(car.x, car.z, 1.7);
        if (p) { this.pedestrians.knockDown(p); this.wanted.crime(26); }
      }
    },
  };
  return world;
}
