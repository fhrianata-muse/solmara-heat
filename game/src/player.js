// player.js — Mara Voss herself: on-foot movement relative to the camera,
// sprinting, building collision, getting in and out of cars, and the chase
// camera that follows her — with game-feel trauma shake and the speed FOV
// kick from LOOK.md layered on top, never inside the simulation.

import { collideBuildings, CITY_HALF, BEACH_Z } from './city.js';
import { buildPerson } from './pedestrians.js';
import { mergeParts, partMaterial } from './materials.js';

/**
 * Mara on the shared rig (pedestrians.js): coral jacket, dark jeans, and a
 * long-hair back panel as her silhouette signature. The rig stands 1.76 m;
 * Mara is contracted at 1.72 m, so she is scaled to it.
 */
function buildMara() {
  const figure = buildPerson({
    shirt: 0xe2483d, pants: 0x22384f, skin: 0xc68863, hair: 0x2b1a12, hat: 0, bag: false,
  });
  const hairPanel = new THREE.Mesh(mergeParts([
    { geo: new THREE.BoxGeometry(0.3, 0.52, 0.07), color: 0x2b1a12, y: 1.38, z: -0.17 },
  ]), partMaterial);
  figure.add(hairPanel);
  figure.scale.setScalar(1.72 / 1.76);
  return figure;
}

export class Player {
  constructor(scene, x, z) {
    this.mesh = buildMara();
    scene.add(this.mesh);
    this.x = x; this.z = z;
    this.heading = 0;
    this.stridePhase = 0;
    this.car = null;          // the Car she is driving, or null on foot
    this.camHeading = 0;
    this.aiming = false;      // set by main.js while the fire input is held
    this.trauma = 0;          // impact shake charge, 0..1, decays in real time
    this.shakeClock = 0;
  }

  get pos() { return this.car ? { x: this.car.x, z: this.car.z } : { x: this.x, z: this.z }; }
  get speed() { return this.car ? this.car.speed : 0; }

  enterCar(car) {
    this.car = car;
    car.occupied = true;
    this.mesh.visible = false;
    this.camHeading = car.heading;
  }

  exitCar() {
    if (!this.car) return null;
    const car = this.car;
    car.occupied = false;
    car.speed = 0;
    // Step out on the car's left side.
    this.x = car.x + Math.cos(car.heading) * 2.6;
    this.z = car.z - Math.sin(car.heading) * 2.6;
    this.car = null;
    this.mesh.visible = true;
    return car;
  }

  /** On-foot step. input: { x strafe, z forward, sprint, camLeft, camRight }. */
  walk(dt, input, colliders) {
    const moving = input.x !== 0 || input.z !== 0;
    if (input.camLeft) this.camHeading += dt * 1.9;
    if (input.camRight) this.camHeading -= dt * 1.9;
    if (moving) {
      this.heading = this.camHeading + Math.atan2(input.x, input.z);
      const speed = input.sprint ? 10.5 : 6.2;
      let nx = this.x + Math.sin(this.heading) * speed * dt;
      let nz = this.z + Math.cos(this.heading) * speed * dt;
      [nx, nz] = collideBuildings(colliders, nx, nz, 0.8);
      this.x = Math.max(-CITY_HALF - 4, Math.min(CITY_HALF + 4, nx));
      this.z = Math.max(-CITY_HALF - 4, Math.min(BEACH_Z + 24, nz));
      this.stridePhase += dt * speed * 1.9;
    }
    const swing = moving ? Math.sin(this.stridePhase) * 0.55 : 0;
    const limbs = this.mesh.userData;
    limbs.legL.rotation.x = swing;
    limbs.legR.rotation.x = -swing;
    if (this.aiming) limbs.setAim(true);
    else {
      limbs.armL.rotation.x = -swing * 0.75;
      limbs.armR.rotation.x = swing * 0.75;
    }
    this.mesh.position.set(this.x, moving ? Math.abs(Math.sin(this.stridePhase)) * 0.06 : 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  /** Impacts ADD trauma (they never reset it); the camera reads trauma². */
  addTrauma(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  /** Chase camera: behind and above Mara or her car, exponentially smoothed. */
  updateCamera(camera, dt) {
    const anchor = this.car
      ? { x: this.car.x, z: this.car.z }
      : { x: this.x, z: this.z };
    if (this.car) {
      this.camHeading += shortestAngle(this.camHeading, this.car.heading) * Math.min(1, dt * 2.2);
    }
    const back = this.car ? 11.5 : 8.5;
    const up = this.car ? 4.6 : 3.6;
    const wantedX = anchor.x - Math.sin(this.camHeading) * back;
    const wantedZ = anchor.z - Math.cos(this.camHeading) * back;
    const ease = Math.min(1, dt * 7);
    camera.position.x += (wantedX - camera.position.x) * ease;
    camera.position.y += (up - camera.position.y) * ease;
    camera.position.z += (wantedZ - camera.position.z) * ease;
    // Speed FOV kick: +6 opening up as the car passes 24 m/s (LOOK.md).
    const baseFov = this.car ? 62 : 58;
    const kick = this.car ? Math.max(0, Math.min(1, (Math.abs(this.car.speed) - 24) / 10)) * 6 : 0;
    const fov = baseFov + kick;
    if (Math.abs(camera.fov - fov) > 0.02) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 5);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(anchor.x, 1.4, anchor.z);
    // Trauma shake offsets the camera only — the world never feels it — and
    // decays on real time so the frame always settles back to rest.
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
      this.shakeClock += dt * 34;
      const strength = this.trauma * this.trauma;
      const t = this.shakeClock;
      camera.position.x += Math.sin(t * 1.7) * 0.34 * strength;
      camera.position.y += Math.sin(t * 2.3) * 0.24 * strength;
      camera.rotation.z += Math.sin(t * 1.1) * 0.02 * strength;
    }
  }
}

/** Signed smallest rotation from `from` to `to`, in (-π, π]. */
export function shortestAngle(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
