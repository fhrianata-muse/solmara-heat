// player.js — Mara Voss on foot: WASD movement relative to the camera, sprint,
// building collision, and the chase camera that follows her or her car.

import { collideBuildings, CITY_HALF, BEACH_Z } from './city.js';
import { buildPerson } from './pedestrians.js';
import { mergeParts, partMaterial } from './materials.js';

// Mara on the shared authored rig (pedestrians.js): coral jacket + dark jeans
// read at 30 m, and a long-hair back panel is her silhouette signature.
function makeMara() {
  const g = buildPerson({
    shirt: 0xe2483d, pants: 0x22384f, skin: 0xc68863, hair: 0x2b1a12, hat: 0, bag: false,
  });
  const back = new THREE.Mesh(mergeParts([
    { geo: new THREE.BoxGeometry(0.3, 0.52, 0.07), color: 0x2b1a12, y: 1.38, z: -0.17 },
  ]), partMaterial);
  g.add(back);
  g.scale.setScalar(1.72 / 1.76); // the rig is 1.76 m; Mara is contracted at 1.72 m
  return g;
}

export class Player {
  constructor(scene, x, z) {
    this.mesh = makeMara(); scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = 0; this.phase = 0;
    this.car = null;               // the Car she is driving, or null on foot
    this.camHeading = 0;
    this.aiming = false;           // set by main while the fire input is held
    this.trauma = 0;               // game-feel shake, decays on real time
    this.shakeT = 0;
  }
  get pos() { return this.car ? { x: this.car.x, z: this.car.z } : { x: this.x, z: this.z }; }
  get speed() { return this.car ? this.car.speed : 0; }
  enterCar(car) {
    this.car = car; car.occupied = true; this.mesh.visible = false;
    this.camHeading = car.heading;
  }
  exitCar() {
    if (!this.car) return null;
    const car = this.car;
    car.occupied = false; car.speed = 0;
    this.x = car.x + Math.cos(car.heading) * 2.6;
    this.z = car.z - Math.sin(car.heading) * 2.6;
    this.car = null; this.mesh.visible = true;
    return car;
  }
  /** On-foot step. input: {x: -1..1 strafe, z: -1..1 forward, sprint}. */
  walk(dt, input, colliders) {
    const moving = input.x !== 0 || input.z !== 0;
    if (input.camLeft) this.camHeading += dt * 1.9;
    if (input.camRight) this.camHeading -= dt * 1.9;
    if (moving) {
      this.heading = this.camHeading + Math.atan2(input.x, input.z);
      const sp = input.sprint ? 10.5 : 6.2;
      let nx = this.x + Math.sin(this.heading) * sp * dt;
      let nz = this.z + Math.cos(this.heading) * sp * dt;
      [nx, nz] = collideBuildings(colliders, nx, nz, 0.8);
      this.x = Math.max(-CITY_HALF - 4, Math.min(CITY_HALF + 4, nx));
      this.z = Math.max(-CITY_HALF - 4, Math.min(BEACH_Z + 24, nz));
      this.phase += dt * sp * 1.9;
    }
    const swing = moving ? Math.sin(this.phase) * 0.55 : 0;
    const u = this.mesh.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    if (this.aiming) u.setAim(true);
    else { u.armL.rotation.x = -swing * 0.75; u.armR.rotation.x = swing * 0.75; }
    this.mesh.position.set(this.x, moving ? Math.abs(Math.sin(this.phase)) * 0.06 : 0, this.z);
    this.mesh.rotation.y = this.heading;
  }
  /** Impacts add trauma (hits add, they don't reset); shake reads trauma². */
  addTrauma(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  /** Chase camera: behind and above the player or car, smoothed. */
  updateCamera(camera, dt) {
    const target = this.car ? { x: this.car.x, z: this.car.z, h: this.car.heading } : { x: this.x, z: this.z, h: this.camHeading };
    if (this.car) this.camHeading += shortestAngle(this.camHeading, this.car.heading) * Math.min(1, dt * 2.2);
    const back = this.car ? 11.5 : 8.5, up = this.car ? 4.6 : 3.6;
    const cx = target.x - Math.sin(this.camHeading) * back;
    const cz = target.z - Math.cos(this.camHeading) * back;
    const k = Math.min(1, dt * 7);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (up - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    // Speed FOV kick (LOOK.md): +6 opening up as the car passes 24 m/s.
    const baseFov = this.car ? 62 : 58;
    const speedKick = this.car ? Math.max(0, Math.min(1, (Math.abs(this.car.speed) - 24) / 10)) * 6 : 0;
    const fov = baseFov + speedKick;
    if (Math.abs(camera.fov - fov) > 0.02) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 5);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target.x, 1.4, target.z);
    // Trauma shake writes the camera offset only — never the simulation —
    // and decays on real time so it always returns to rest.
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
      this.shakeT += dt * 34;
      const s = this.trauma * this.trauma, t = this.shakeT;
      camera.position.x += Math.sin(t * 1.7) * 0.34 * s;
      camera.position.y += Math.sin(t * 2.3) * 0.24 * s;
      camera.rotation.z += Math.sin(t * 1.1) * 0.02 * s;
    }
  }
}

export function shortestAngle(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
