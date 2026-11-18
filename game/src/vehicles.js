// vehicles.js — cars built the authored way: each body is an extruded side
// profile with a bevel (never stacked boxes), the glasshouse is a second,
// narrower extrusion, and every small part — bumpers, arches, grille, mirrors,
// spoiler — is merged into one vertex-coloured detail mesh. Wheels are real
// cylinders that roll. Plus the arcade driving physics every car shares.

import {
  paintMaterial, glassMaterial, wheelMaterial, partMaterial, lampGlowMaterial, mergeParts,
} from './materials.js';

// Muted traffic paints (LOOK.md): no neon.
export const CAR_COLORS = [0xc0c6cc, 0x7f9fb3, 0xb3563f, 0x5f7f6a, 0xd8cfc0, 0x44586e, 0xc7a23a, 0x8a8f96];
export const HERO_COLOR = 0xe2483d; // Mara's coral coupe (LOOK.md player accent)

// Side profiles in metres: x is forward (+x becomes +z after the turn below),
// y is up. The body profile stops at the beltline; the glasshouse sits on it.
const PROFILES = {
  coupe: {
    length: 4.4, width: 1.82, axle: 1.42,
    body: [[-2.2, 0.28], [-2.2, 0.74], [-1.55, 0.84], [1.5, 0.8], [2.2, 0.6], [2.2, 0.28]],
    glass: [[-1.5, 0.84], [-0.85, 1.22], [-0.08, 1.24], [0.48, 1.24], [1.1, 1.0], [1.52, 0.84]],
    roof: [-0.14, 0.54, 1.17, 1.26],
  },
  sedan: {
    length: 4.5, width: 1.84, axle: 1.45,
    body: [[-2.25, 0.3], [-2.25, 0.84], [-1.7, 0.88], [1.55, 0.84], [2.25, 0.62], [2.25, 0.3]],
    glass: [[-1.62, 0.88], [-1.0, 1.3], [-0.5, 1.32], [0.6, 1.32], [1.25, 1.05], [1.62, 0.88]],
    roof: [-0.56, 0.66, 1.25, 1.34],
  },
  hatch: {
    length: 3.9, width: 1.78, axle: 1.25,
    body: [[-1.95, 0.3], [-1.95, 0.82], [-1.5, 0.86], [1.3, 0.82], [1.95, 0.6], [1.95, 0.3]],
    glass: [[-1.55, 0.86], [-1.32, 1.27], [-0.7, 1.3], [0.45, 1.3], [1.05, 1.02], [1.45, 0.86]],
    roof: [-0.74, 0.5, 1.23, 1.32],
  },
  pickup: {
    length: 5.0, width: 1.9, axle: 1.6,
    body: [[-2.5, 0.32], [-2.5, 0.94], [-0.2, 0.94], [1.3, 0.9], [2.5, 0.66], [2.5, 0.32]],
    glass: [[-0.25, 0.96], [-0.15, 1.4], [0.75, 1.4], [1.28, 1.08], [1.38, 0.96]],
    roof: [-0.18, 0.8, 1.34, 1.43],
  },
};

/** Extrude a side profile (shape x = forward, y = up) into a car-width solid. */
function extrudeProfile(points, width, bevel = 0.045) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i], [px, py] = points[i - 1];
    const mx = (px + x) / 2, my = (py + y) / 2 + (y - py) * 0.12;
    shape.quadraticCurveTo(mx, my, x, y);
  }
  shape.closePath();
  const depth = Math.max(0.2, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 1, steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2); // shape +x (forward) becomes world +z
  return geo;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);

// One wheel geometry for every car: tyre + hub merged, vertex-coloured.
const wheelGeo = mergeParts([
  { geo: cyl(0.42, 0.42, 0.3, 14), color: 0x17181a, rz: Math.PI / 2 },
  { geo: cyl(0.21, 0.21, 0.32, 10), color: 0xb9c0c6, rz: Math.PI / 2 },
  { geo: box(0.34, 0.07, 0.07), color: 0x8f979e, x: 0.17 },
  { geo: box(0.34, 0.07, 0.07), color: 0x8f979e, x: -0.17 },
]);

/** Build a car mesh. kind: 'coupe' | 'sedan' | 'hatch' | 'pickup' | 'police'. */
export function makeCarMesh(color, kind) {
  const prof = PROFILES[kind === 'police' ? 'sedan' : kind] || PROFILES.sedan;
  const { length: L, width: W, axle } = prof;
  // Police livery is white over navy (LOOK.md) whatever colour was requested.
  const paint = paintMaterial(kind === 'police' ? 0xf4f6f8 : color);
  const g = new THREE.Group();

  const body = new THREE.Mesh(extrudeProfile(prof.body, W), paint);
  body.castShadow = true; g.add(body);
  const glass = new THREE.Mesh(extrudeProfile(prof.glass, W - 0.22, 0.02), glassMaterial);
  g.add(glass);
  const [rx0, rx1, ry0, ry1] = prof.roof;
  const roofShape = [[rx0, ry0], [rx0 + 0.06, ry1], [rx1 - 0.06, ry1], [rx1, ry0]];
  const roof = new THREE.Mesh(extrudeProfile(roofShape, W - 0.16, 0.015),
    kind === 'police' ? paintMaterial(0xf4f6f8) : paint);
  g.add(roof);

  const detail = [
    { geo: box(W - 0.06, 0.24, 0.22), color: 0x24282c, y: 0.34, z: L / 2 - 0.03 },   // front bumper
    { geo: box(W - 0.06, 0.24, 0.22), color: 0x24282c, y: 0.34, z: -L / 2 + 0.03 },  // rear bumper
    { geo: box(1.1, 0.16, 0.06), color: 0x14161a, y: 0.52, z: L / 2 + 0.03 },        // grille
    { geo: box(0.09, 0.09, 0.2), color: 0x9aa2a8, x: 0.6, y: 0.2, z: -L / 2 - 0.04 }, // exhaust
    { geo: box(0.16, 0.1, 0.09), color: 0x24282c, x: W / 2 + 0.05, y: 1.0, z: 0.95 }, // mirrors
    { geo: box(0.16, 0.1, 0.09), color: 0x24282c, x: -W / 2 - 0.05, y: 1.0, z: 0.95 },
  ];
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    detail.push({ geo: new THREE.CircleGeometry(0.53, 12), color: 0x101214, // wheel arch shadow disc
      x: sx * (W / 2 + 0.006), y: 0.42, z: sz * axle, ry: sx * Math.PI / 2 });
    detail.push({ geo: box(0.05, 0.16, L * 0.5), color: 0x1d2023, x: sx * (W / 2 - 0.02), y: 0.24, z: 0 }); // skirt
  }
  if (kind === 'coupe') {
    detail.push({ geo: box(1.5, 0.06, 0.36), color, y: 1.0, z: -2.02 });            // spoiler blade
    detail.push({ geo: box(0.08, 0.16, 0.08), color: 0x24282c, x: 0.55, y: 0.9, z: -2.02 });
    detail.push({ geo: box(0.08, 0.16, 0.08), color: 0x24282c, x: -0.55, y: 0.9, z: -2.02 });
    // Cream racing stripes over hood, roof and deck: the hero's signature.
    detail.push({ geo: box(0.52, 0.03, 0.95), color: 0xf2e3c6, y: 0.845, z: 1.5, rx: -0.1 });
    detail.push({ geo: box(0.52, 0.025, 0.8), color: 0xf2e3c6, y: 1.275, z: 0.18 });
    detail.push({ geo: box(0.52, 0.03, 0.62), color: 0xf2e3c6, y: 0.865, z: -1.82, rx: 0.08 });
    detail.push({ geo: box(1.7, 0.09, 0.3), color: 0x1d2023, y: 0.22, z: 2.12 });    // front splitter
  }
  if (kind === 'pickup') {
    detail.push({ geo: box(W - 0.3, 0.08, 2.0), color: 0x2c2f33, y: 0.95, z: -1.38 }); // bed floor
    detail.push({ geo: box(W - 0.24, 0.3, 0.08), color: 0x3a3e42, y: 1.05, z: -0.42 }); // bed front rail
  }
  if (kind === 'police') {
    for (const sx of [1, -1]) detail.push({ geo: box(0.05, 0.36, 3.3), color: 0x22406b, x: sx * (W / 2 + 0.004), y: 0.58, z: 0 }); // navy doors band
    detail.push({ geo: box(1.5, 0.42, 0.14), color: 0x1d2023, y: 0.45, z: L / 2 + 0.14 }); // push bar
    detail.push({ geo: box(1.3, 0.09, 0.5), color: 0x1d2023, y: 1.42, z: -0.05 });          // lightbar base
  }
  const detailMesh = new THREE.Mesh(mergeParts(detail), partMaterial);
  g.add(detailMesh);

  const lights = new THREE.Mesh(mergeParts([
    { geo: box(0.36, 0.13, 0.05), color: 0xfff3b0, x: 0.58, y: 0.6, z: L / 2 + 0.04 },
    { geo: box(0.36, 0.13, 0.05), color: 0xfff3b0, x: -0.58, y: 0.6, z: L / 2 + 0.04 },
    { geo: box(0.38, 0.12, 0.05), color: 0xff2d20, x: 0.6, y: 0.64, z: -L / 2 - 0.04 },
    { geo: box(0.38, 0.12, 0.05), color: 0xff2d20, x: -0.6, y: 0.64, z: -L / 2 - 0.04 },
  ]), lampGlowMaterial);
  g.add(lights);

  const wheels = [];
  for (const [wx, wz] of [[-0.84, axle], [0.84, axle], [-0.84, -axle], [0.84, -axle]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMaterial);
    w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;

  if (kind === 'police') {
    const mkLamp = (c) => {
      const m = new THREE.Mesh(box(0.58, 0.2, 0.44), new THREE.MeshBasicMaterial({ color: c }));
      m.position.y = 1.56; g.add(m); return m;
    };
    const red = mkLamp(0xff2222); red.position.x = -0.33; red.position.z = -0.05;
    const blue = mkLamp(0x2266ff); blue.position.x = 0.33; blue.position.z = -0.05;
    const light = new THREE.PointLight(0xff3333, 0, 17, 2);
    light.position.set(0, 1.8, 0); g.add(light);
    g.userData.lightBar = [red, blue];
    g.userData.barLight = light;
  }
  return g;
}

/** One drivable car: position, heading, speed, health, and who is driving it. */
export class Car {
  constructor(scene, x, z, heading, color, kind = 'sedan') {
    this.mesh = makeCarMesh(color, kind);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0; this.steer = 0; this.health = 100;
    this.kind = kind; this.occupied = false; this.dead = false;
    this.flashTimer = Math.random() * 6;
    this.onSkid = null; this._skidT = 0;
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
    // Drifting on the handbrake lays rubber: effects hook, set by the world.
    this._skidT -= dt;
    if (this.onSkid && input.brake && Math.abs(this.speed) > 9 && this._skidT <= 0) {
      this._skidT = 0.07;
      this.onSkid(this.x - Math.sin(this.heading) * 1.4, this.z - Math.cos(this.heading) * 1.4, this.heading);
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
    if (dt > 0) {
      const roll = (this.speed * dt) / 0.42;
      for (const w of this.mesh.userData.wheels) w.rotation.x += roll;
    }
    if (this.mesh.userData.lightBar) {
      this.flashTimer += dt * 7;
      const on = Math.sin(this.flashTimer) > 0;
      const [red, blue] = this.mesh.userData.lightBar;
      red.visible = on; blue.visible = !on;
      const light = this.mesh.userData.barLight;
      if (light) { light.color.set(on ? 0xff3333 : 0x3366ff); light.intensity = 1.5; }
    }
    if (this.health <= 0 && !this.dead) { this.dead = true; this.mesh.rotation.z = 0.16; }
  }
}

const PARKED_KINDS = ['sedan', 'hatch', 'pickup', 'coupe', 'sedan', 'hatch'];

/** A handful of parked cars along the beachfront and downtown, ready to steal. */
export function spawnParkedCars(scene, rand) {
  const spots = [
    [-20, 160, 0.2], [24, 158, -0.15], [66, 160, 0.1], [-64, 158, 0], [110, 160, -0.2],
    [-2, -20, Math.PI / 2], [46, 24, 0], [-46, -66, Math.PI / 2], [90, -20, 0], [-90, 68, Math.PI],
    [2, 112, Math.PI / 2], [134, 24, 0], [-134, -20, Math.PI / 2], [22, -112, 0],
  ];
  return spots.map(([x, z, h], i) => new Car(scene, x, z, h,
    CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], PARKED_KINDS[i % PARKED_KINDS.length]));
}
