// shots.js — the four staged screenshot scenes behind ?shot=chase|foot|mission|coast.
//
// Every scene builds the REAL world (gameworld.js) with the capture seed,
// sets the story state the frame needs, then simulates forward with an
// autopilot at the wheel — so a screenshot is a genuine moment of play and
// the same seed always lands on the same frame. A few actors are then placed
// by hand (the two chasing cruisers, the walkers on Mara's street) because a
// contact sheet has to promise the chase and the street life every time,
// not only when the simulation happens to arrange them.

import { createWorld } from './gameworld.js';
import { Car } from './vehicles.js';

const TICK = 1 / 30;

/** Steer Mara's coupe toward a target point at screenshot pace. */
function autopilot(world, dt, targetX, targetZ) {
  const car = world.playerCar;
  const desired = Math.atan2(targetX - car.x, targetZ - car.z);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.drive(dt, {
    throttle: car.speed < 17 ? 1 : 0.25,
    steer: Math.max(-1, Math.min(1, diff * 1.8)),
    boost: false, brake: false,
  }, world.city.colliders, null);
}

/** Run the world forward; the staged wanted level is pinned while we do. */
function runFor(world, seconds, driveTarget) {
  const steps = Math.round(seconds / TICK);
  for (let i = 0; i < steps; i++) {
    if (driveTarget) autopilot(world, TICK, driveTarget[0], driveTarget[1]);
    world.simulate(TICK, null);
    world.wanted.cooldown = 99;
  }
}

/** Swap whatever cruisers the simulation raised for hand-placed ones. */
function placeCruisers(world, spots) {
  for (const cop of world.police.cruisers) world.scene.remove(cop.mesh);
  world.police.cruisers = spots.map(([x, z, h]) => {
    const cop = new Car(world.scene, x, z, h, 0x182848, 'police');
    cop.flashTimer = 2;
    cop.syncMesh(0.4);
    return cop;
  });
}

function placeHeli(world, x, y, z) {
  world.police.heli.visible = true;
  world.police.heli.position.set(x, y, z);
  world.police.heli.rotation.y = 0.7;
  world.police.heli.userData.rotor.rotation.y = 2.2;
}

/** Park a few traffic cars where the frame needs them. */
function placeTraffic(world, spots) {
  spots.forEach(([x, z, h], i) => {
    const car = world.traffic.cars[i * 3];
    if (car) {
      car.place(x, z, h);
      car.speed = 0;
    }
  });
}

/** Cover: a 4-star chase up a downtown avenue, helicopter overhead. */
function sceneChase(world) {
  world.wanted.stars = 4;
  world.wanted.heat = 30;
  world.missions.index = 2;
  world.missions.phase = 'deliver';
  world.missions.timer = 47;
  world.playerCar.place(-22, -26, 0);
  world.player.enterCar(world.playerCar);
  runFor(world, 2.4, [-22, 190]);
  const c = world.playerCar;
  placeCruisers(world, [[c.x - 2.8, c.z - 7.5, 0.08], [c.x + 5.2, c.z - 14.5, -0.06]]);
  placeTraffic(world, [[-26.5, c.z + 22, Math.PI], [-18, c.z + 38, 0]]);
  placeHeli(world, c.x - 5, 15, c.z + 32);
  world.camera.position.set(c.x + 1.2, 3.8, c.z - 13.5);
  world.camera.lookAt(c.x - 0.5, 1.6, c.z + 8);
}

/** On foot: Mara on Palms Row, her coupe waiting, the marker ahead. */
function sceneFoot(world) {
  world.missions.index = 0;
  world.missions.phase = 'pickup';
  world.player.x = -154;
  world.player.z = 147;
  world.player.heading = Math.PI;
  world.player.camHeading = Math.PI;
  world.playerCar.place(-149, 156, 0.4);
  const walkers = [[-151, 137, 2.8], [-157.5, 129, -0.4], [-150.5, 121, 3.1], [-158, 141, 1.2]];
  walkers.forEach(([x, z, h], i) => {
    const person = world.pedestrians.people[i * 4];
    if (person) { person.x = x; person.z = z; person.heading = h; }
  });
  world.parked[0].place(-149.5, 124, 0.15);
  runFor(world, 0.8, null);
  world.player.x = -154;
  world.player.z = 147;
  world.player.heading = Math.PI;
  world.player.mesh.position.set(-154, 0, 147);
  world.player.mesh.rotation.y = Math.PI;
  world.camera.position.set(-152.5, 3.1, 156.5);
  world.camera.lookAt(-154.5, 1.4, 128);
}

/** Mission: a delivery run east with one cruiser on her tail. */
function sceneMission(world) {
  world.wanted.stars = 2;
  world.wanted.heat = 20;
  world.missions.index = 3;
  world.missions.phase = 'deliver';
  world.missions.timer = 38;
  world.cash = 2740;
  world.playerCar.place(56, 22, Math.PI / 2);
  world.player.enterCar(world.playerCar);
  runFor(world, 2.0, [210, 22]);
  const c = world.playerCar;
  placeCruisers(world, [[c.x - 6, c.z - 3.2, Math.PI / 2]]);
  placeTraffic(world, [[c.x + 24, 26.5, -Math.PI / 2]]);
  world.camera.position.set(c.x - 13.5, 4.8, c.z - 8.5);
  world.camera.lookAt(c.x + 9, 1.7, c.z + 1.5);
}

/** Coast: the bay road, skyline behind, sea beside, story mid-run. */
function sceneCoast(world) {
  world.missions.index = 4;
  world.missions.phase = 'pickup';
  world.cash = 4100;
  world.playerCar.place(-72, 166, Math.PI / 2);
  world.player.enterCar(world.playerCar);
  runFor(world, 2.2, [210, 166]);
  const c = world.playerCar;
  c.place(c.x, 166, Math.PI / 2);
  placeTraffic(world, [[c.x + 26, 170, -Math.PI / 2], [c.x - 24, 162, Math.PI / 2]]);
  const strollers = [[c.x + 9, 158.5, -1.2], [c.x + 15, 174.5, 2.4]];
  strollers.forEach(([x, z, h], i) => {
    const person = world.pedestrians.people[i * 5 + 1];
    if (person) {
      person.x = x; person.z = z; person.heading = h;
      person.mesh.position.set(x, 0, z);
      person.mesh.rotation.y = h;
    }
  });
  world.camera.position.set(c.x - 11, 4.4, c.z + 11.5);
  world.camera.lookAt(c.x + 13, 1.7, c.z - 3);
}

export const SHOT_SCENES = {
  chase: sceneChase,
  foot: sceneFoot,
  mission: sceneMission,
  coast: sceneCoast,
};

/** Build and stage a scene; the world comes back ready to render. */
export function stageShot(name, seed, renderer) {
  const world = createWorld(seed, renderer);
  (SHOT_SCENES[name] || sceneChase)(world);
  // Settle the mission marker onto the scene's target with a zero-length
  // update: it positions the beacon but advances nothing.
  world.missions.update(0, world.player.pos, world.wanted);
  return world;
}
