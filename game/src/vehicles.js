// vehicles.js — low-poly cars built from boxes, plus the driving physics every
// car in Solmara Bay shares: accelerate, steer, handbrake drift, building bumps.

export const CAR_COLORS = [0xff5252, 0xffb340, 0x4dc3ff, 0x7dff8a, 0xff7ad9, 0xf5f5f5, 0x9b7bff, 0xff8c42];

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1e });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x2e5a78, emissive: 0x14384e, emissiveIntensity: 0.6 });

function addBox(group, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); group.add(m); return m;
}

/** Build a car mesh. kind: 'car' | 'police' | 'heli' is handled in police.js. */
export function makeCarMesh(color, kind) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  addBox(g, 2.1, 0.62, 4.4, paint, 0, 0.62, 0);                    // body
  addBox(g, 1.72, 0.55, 1.95, glassMat, 0, 1.16, -0.25);           // cabin glass
  addBox(g, 2.14, 0.2, 1.1, paint, 0, 0.78, 1.85);                 // nose scoop
  addBox(g, 2.0, 0.14, 0.5, paint, 0, 1.02, -2.05);                // spoiler
  const lightF = new THREE.MeshLambertMaterial({ color: 0xfff6b8, emissive: 0xffe98a, emissiveIntensity: 0.9 });
  const lightR = new THREE.MeshLambertMaterial({ color: 0xff3b30, emissive: 0xa3120c, emissiveIntensity: 0.7 });
  addBox(g, 0.42, 0.2, 0.1, lightF, -0.7, 0.66, 2.22);
  addBox(g, 0.42, 0.2, 0.1, lightF, 0.7, 0.66, 2.22);
  addBox(g, 0.42, 0.18, 0.1, lightR, -0.7, 0.7, -2.22);
  addBox(g, 0.42, 0.18, 0.1, lightR, 0.7, 0.7, -2.22);
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  if (kind === 'police') {
    addBox(g, 2.12, 0.55, 4.42, new THREE.MeshLambertMaterial({ color: 0xffffff }), 0, 0.64, 0.4);
    const bar = new THREE.Group();
    const red = addBox(bar, 0.62, 0.28, 0.7, new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1 }), -0.34, 0, 0);
    const blue = addBox(bar, 0.62, 0.28, 0.7, new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 1 }), 0.34, 0, 0);
    bar.position.set(0, 1.62, -0.25); g.add(bar);
    g.userData.lightBar = [red, blue];
  }
  g.userData.wheels = wheels;
  return g;
}

/** One drivable car: position, heading, speed, health, and who is driving it. */
export class Car {
  constructor(scene, x, z, heading, color, kind = 'car') {
    this.mesh = makeCarMesh(color, kind);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0; this.steer = 0; this.health = 100;
    this.kind = kind; this.occupied = false; this.dead = false;
    this.flashTimer = 0;
  }
  get pos() { return this.mesh.position; }
  /** Arcade drive step. input: {throttle -1..1, steer -1..1, boost, brake}. */
  drive(dt, input, colliders, collideFn) {
    const accel = input.throttle * (input.boost ? 34 : 24);
    this.speed += accel * dt;
    if (input.brake) this.speed -= this.speed * 3.2 * dt;
    this.speed -= this.speed * 0.55 * dt;                       // drag
    this.speed = Math.max(-13, Math.min(input.boost ? 40 : 30, this.speed));
    this.steer += ((input.steer || 0) - this.steer) * Math.min(1, dt * 8);
    if (Math.abs(this.speed) > 0.4) {
      const grip = input.brake ? 1.7 : 1.05;
      this.heading -= this.steer * grip * dt * Math.sign(this.speed) * Math.min(1, Math.abs(this.speed) / 11);
    }
    let nx = this.x + Math.sin(this.heading) * this.speed * dt;
    let nz = this.z + Math.cos(this.heading) * this.speed * dt;
    if (colliders && collideFn) {
      const before = [nx, nz];
      [nx, nz] = collideFn(colliders, nx, nz, 1.7);
      if (Math.abs(nx - before[0]) > 0.01 || Math.abs(nz - before[1]) > 0.01) {
        this.speed *= 0.45; this.health -= Math.abs(this.speed) * 0.12;
        this.bumped = true;
      }
    }
    this.x = Math.max(-228, Math.min(228, nx));
    this.z = Math.max(-228, Math.min(258, nz));
    this.syncMesh(dt);
  }
  /** Parked / AI move: just place and face. */
  place(x, z, heading) { this.x = x; this.z = z; this.heading = heading; this.syncMesh(0); }
  syncMesh(dt) {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    // Wheels stay as clean dark discs: spinning them around the wrong local axis
    // smears them into ellipses at screenshot size, so they are not rotated.
    if (this.mesh.userData.lightBar) {
      this.flashTimer += dt * 9;
      const on = Math.sin(this.flashTimer) > 0;
      this.mesh.userData.lightBar[0].material.emissiveIntensity = on ? 1.6 : 0.1;
      this.mesh.userData.lightBar[1].material.emissiveIntensity = on ? 0.1 : 1.6;
    }
    if (this.health <= 0 && !this.dead) { this.dead = true; this.mesh.rotation.z = 0.16; }
  }
}

/** A handful of parked cars along the beachfront and downtown, ready to steal. */
export function spawnParkedCars(scene, rand) {
  const spots = [
    [-20, 160, 0.2], [24, 158, -0.15], [66, 160, 0.1], [-64, 158, 0], [110, 160, -0.2],
    [-2, -20, Math.PI / 2], [46, 24, 0], [-46, -66, Math.PI / 2], [90, -20, 0], [-90, 68, Math.PI],
    [2, 112, Math.PI / 2], [134, 24, 0], [-134, -20, Math.PI / 2], [22, -112, 0],
  ];
  return spots.map(([x, z, h], i) => new Car(scene, x, z, h, CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)]));
}
