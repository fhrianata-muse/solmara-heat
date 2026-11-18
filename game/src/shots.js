// shots.js — deterministic screenshot scenes behind ?shot=chase|foot|mission|coast.
// Each scene builds the real world with a fixed seed, stages Mara, the police and
// the mission state the scene needs, then simulates the world forward with an
// autopilot driver, so the frame is a real moment of play and the same seed
// always produces the same frame. After the simulation, a few actors are placed
// by hand (cruisers behind Mara, walkers near her) so the decisive frame always
// shows the chase / street life the scene promises, at screenshot size.

import { createWorld } from './gameworld.js';
import { Car } from './vehicles.js';

const STEP = 1 / 30;

/** Drive Mara's car ahead, steering gently toward a target point. */
function autopilotDrive(world, dt, targetX, targetZ) {
  const car = world.playerCar;
  const dx = targetX - car.x, dz = targetZ - car.z;
  const desired = Math.atan2(dx, dz);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.drive(dt, {
    throttle: car.speed < 17 ? 1 : 0.25,
    steer: Math.max(-1, Math.min(1, diff * 1.8)),
    boost: false, brake: false,
  }, world.city.colliders, null);
}

function simulate(world, seconds, driveTarget) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    if (driveTarget) autopilotDrive(world, STEP, driveTarget[0], driveTarget[1]);
    world.simulate(STEP, null);
    world.wanted.cooldown = 99; // keep the staged wanted level from decaying mid-scene
  }
}

/** Replace whatever cruisers the simulation spawned with two staged ones. */
function stageCruisers(world, spots) {
  for (const cop of world.police.cruisers) world.scene.remove(cop.mesh);
  world.police.cruisers = spots.map(([x, z, h]) => {
    const cop = new Car(world.scene, x, z, h, 0x182848, 'police');
    cop.flashTimer = 2; cop.syncMesh(0.4);
    return cop;
  });
}

function stageHeli(world, x, y, z) {
  world.police.heli.visible = true;
  world.police.heli.position.set(x, y, z);
  world.police.heli.rotation.y = 0.7;
  world.police.heli.userData.rotor.rotation.y = 2.2;
}

function stageTraffic(world, spots) {
  spots.forEach(([x, z, h], i) => {
    const car = world.traffic.cars[i * 3];
    if (car) { car.place(x, z, h); car.speed = 0; }
  });
}

function stageChase(world) {
  world.wanted.stars = 4; world.wanted.heat = 30;
  world.missions.index = 2; world.missions.phase = 'deliver'; world.missions.timer = 47;
  world.playerCar.place(-22, -26, 0);
  world.player.enterCar(world.playerCar);
  simulate(world, 2.4, [-22, 190]);
  const c = world.playerCar;
  stageCruisers(world, [[c.x - 4.5, c.z - 11, 0.1], [c.x + 4.2, c.z - 16, -0.08]]);
  stageTraffic(world, [[-26.5, c.z + 22, Math.PI], [-18, c.z + 38, 0]]);
  stageHeli(world, c.x - 17, 19, c.z + 28);
  world.camera.position.set(c.x + 1.5, 4.6, c.z - 21);
  world.camera.lookAt(c.x - 1, 1.8, c.z + 12);
}

function stageFoot(world) {
  world.missions.index = 0; world.missions.phase = 'pickup';
  world.player.x = -154; world.player.z = 147; world.player.heading = Math.PI; world.player.camHeading = Math.PI;
  world.playerCar.place(-149, 156, 0.4);
  const spots = [[-151, 137, 2.8], [-157.5, 129, -0.4], [-150.5, 121, 3.1], [-158, 141, 1.2]];
  spots.forEach(([x, z, h], i) => {
    const p = world.pedestrians.people[i * 4];
    if (p) { p.x = x; p.z = z; p.heading = h; }
  });
  world.parked[0].place(-149.5, 124, 0.15);
  simulate(world, 0.8, null);
  world.player.x = -154; world.player.z = 147; world.player.heading = Math.PI;
  world.player.mesh.position.set(-154, 0, 147); world.player.mesh.rotation.y = Math.PI;
  world.camera.position.set(-152.5, 3.1, 156.5);
  world.camera.lookAt(-154.5, 1.4, 128);
}

function stageMission(world) {
  world.wanted.stars = 2; world.wanted.heat = 20;
  world.missions.index = 3; world.missions.phase = 'deliver'; world.missions.timer = 38;
  world.cash = 2740;
  world.playerCar.place(56, 22, Math.PI / 2);
  world.player.enterCar(world.playerCar);
  simulate(world, 2.0, [210, 22]);
  const c = world.playerCar;
  stageCruisers(world, [[c.x - 15, c.z + 3.5, Math.PI / 2]]);
  stageTraffic(world, [[c.x + 24, 26.5, -Math.PI / 2]]);
  world.camera.position.set(c.x - 13.5, 4.8, c.z - 8.5);
  world.camera.lookAt(c.x + 9, 1.7, c.z + 1.5);
}

function stageCoast(world) {
  world.missions.index = 4; world.missions.phase = 'pickup';
  world.cash = 4100;
  world.playerCar.place(-72, 166, Math.PI / 2);
  world.player.enterCar(world.playerCar);
  simulate(world, 2.2, [210, 166]);
  const c = world.playerCar;
  c.place(c.x, 166, Math.PI / 2);
  stageTraffic(world, [[c.x + 26, 170, -Math.PI / 2], [c.x - 24, 162, Math.PI / 2]]);
  const spots = [[c.x + 9, 158.5, -1.2], [c.x + 15, 174.5, 2.4]];
  spots.forEach(([x, z, h], i) => {
    const p = world.pedestrians.people[i * 5 + 1];
    if (p) { p.x = x; p.z = z; p.heading = h; p.mesh.position.set(x, 0, z); p.mesh.rotation.y = h; }
  });
  world.camera.position.set(c.x - 11, 4.4, c.z + 11.5);
  world.camera.lookAt(c.x + 13, 1.7, c.z - 3);
}

export const SHOT_SCENES = { chase: stageChase, foot: stageFoot, mission: stageMission, coast: stageCoast };

/** Build + stage a scene; returns the world ready to render and read state from. */
export function stageShot(name, seed) {
  const world = createWorld(seed);
  (SHOT_SCENES[name] || stageChase)(world);
  // Position the mission beacon/ring on the scene's target (a zero-length
  // update: it moves the marker but advances nothing).
  world.missions.update(0, world.player.pos, world.wanted);
  return world;
}
