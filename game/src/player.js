// player.js — Mara Voss on foot: WASD movement relative to the camera, sprint,
// building collision, and the chase camera that follows her or her car.

import { collideBuildings, CITY_HALF, BEACH_Z } from './city.js';

function makeMara() {
  const g = new THREE.Group();
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.98, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xff5e3a }));
  jacket.position.y = 1.18; g.add(jacket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7),
    new THREE.MeshLambertMaterial({ color: 0xc68863 }));
  head.position.y = 1.98; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x2b1a12 }));
  hair.position.y = 2.18; g.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x22384f });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.74, 0.27), legMat);
  legL.position.set(-0.19, 0.37, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.19; g.add(legR);
  g.userData = { legL, legR };
  return g;
}

export class Player {
  constructor(scene, x, z) {
    this.mesh = makeMara(); scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = 0; this.phase = 0;
    this.car = null;               // the Car she is driving, or null on foot
    this.camHeading = 0;
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
    this.mesh.userData.legL.rotation.x = swing;
    this.mesh.userData.legR.rotation.x = -swing;
    this.mesh.position.set(this.x, moving ? Math.abs(Math.sin(this.phase)) * 0.07 : 0, this.z);
    this.mesh.rotation.y = this.heading;
  }
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
    camera.lookAt(target.x, 1.4, target.z);
  }
}

export function shortestAngle(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
