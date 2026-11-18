// vehicles.js — every car in Solmara Bay, built the authored way and driven
// by one shared arcade physics.
//
// Bodies are NOT stacked boxes: each is a side profile extruded across the
// car's width with a bevel, the glasshouse is a second narrower extrusion on
// top, and the small stuff — bumpers, arches, grille, mirrors, spoiler — is
// merged into a single vertex-coloured detail mesh. Wheels are cylinders
// with spoked hubs, and they roll. Police cruisers add a lightbar whose
// flash also pools on the asphalt: a tinted glow quad under the car, driven
// by the same flash timer, so a chase reads from half a block away.

import {
  paintMaterial, glassMaterial, wheelMaterial, partMaterial, lampGlowMaterial, mergeParts,
} from './materials.js';

// Traffic wears muted paints only (LOOK.md) — no neon in the bay.
export const CAR_COLORS = [0xc0c6cc, 0x7f9fb3, 0xb3563f, 0x5f7f6a, 0xd8cfc0, 0x44586e, 0xc7a23a, 0x8a8f96];

// Mara's coupe: a RICH red-coral. V2 wore the palette accent #E2483D and the
// noon sun plus sky environment washed it pink in every frame; v3 deepens
// the hue and gives the hero its own finish (see heroFinish below).
export const HERO_COLOR = 0xc22e23;
const heroFinish = { roughness: 0.4, metalness: 0.12, env: 0.5 };

// Side profiles in metres. Shape x runs nose-to-tail (it becomes world +z
// after the extrusion turns), y is up. `body` stops at the beltline; the
// `glass` profile sits on it; `roof` is the flat span [x0, x1, y0, y1].
const PROFILES = {
  coupe: {
    length: 4.4, width: 1.82, axle: 1.42,
    body: [[-2.2, 0.3], [-2.18, 0.72], [-1.5, 0.83], [1.45, 0.81], [2.18, 0.62], [2.2, 0.3]],
    glass: [[-1.48, 0.83], [-0.82, 1.21], [-0.05, 1.23], [0.5, 1.23], [1.08, 1.0], [1.5, 0.83]],
    roof: [-0.12, 0.52, 1.16, 1.25],
  },
  sedan: {
    length: 4.5, width: 1.84, axle: 1.45,
    body: [[-2.25, 0.31], [-2.24, 0.82], [-1.66, 0.88], [1.52, 0.85], [2.24, 0.63], [2.25, 0.31]],
    glass: [[-1.6, 0.88], [-0.98, 1.29], [-0.48, 1.31], [0.58, 1.31], [1.22, 1.05], [1.6, 0.88]],
    roof: [-0.54, 0.64, 1.24, 1.33],
  },
  hatch: {
    length: 3.9, width: 1.78, axle: 1.25,
    body: [[-1.95, 0.31], [-1.94, 0.8], [-1.46, 0.86], [1.28, 0.83], [1.94, 0.61], [1.95, 0.31]],
    glass: [[-1.52, 0.86], [-1.3, 1.26], [-0.68, 1.29], [0.44, 1.29], [1.02, 1.02], [1.42, 0.86]],
    roof: [-0.72, 0.48, 1.22, 1.31],
  },
  pickup: {
    length: 5.0, width: 1.9, axle: 1.6,
    body: [[-2.5, 0.33], [-2.49, 0.93], [-0.18, 0.94], [1.28, 0.9], [2.49, 0.67], [2.5, 0.33]],
    glass: [[-0.22, 0.96], [-0.12, 1.39], [0.74, 1.39], [1.26, 1.08], [1.36, 0.96]],
    roof: [-0.16, 0.78, 1.33, 1.42],
  },
};

/** Extrude one side profile into a solid `width` across, with a soft bevel. */
function extrudeProfile(points, width, bevel = 0.045) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i], [px, py] = points[i - 1];
    // A slight lift on each segment midpoint keeps the flanks from looking
    // ruled-straight: sheet metal with a hint of crown.
    shape.quadraticCurveTo((px + x) / 2, (py + y) / 2 + (y - py) * 0.12, x, y);
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

// One wheel for the whole fleet: tyre, hub, and a five-spoke cross merged
// into a single vertex-coloured geometry.
const spokeParts = [
  { geo: cyl(0.42, 0.42, 0.3, 14), color: 0x17181a, rz: Math.PI / 2 },
  { geo: cyl(0.2, 0.2, 0.32, 10), color: 0xb9c0c6, rz: Math.PI / 2 },
];
for (let s = 0; s < 5; s++) {
  const a = (s / 5) * Math.PI * 2;
  spokeParts.push({ geo: box(0.3, 0.075, 0.075), color: 0x8f979e, x: Math.cos(a) * 0.13, y: Math.sin(a) * 0.13, rz: a });
}
const wheelGeo = mergeParts(spokeParts);

/** Soft radial falloff sprite, painted once — tints the lightbar pool. */
function glowSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.38)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}
const GLOW_TEX = glowSpriteTexture();

/** Build a car mesh. kind: 'coupe' | 'sedan' | 'hatch' | 'pickup' | 'police'. */
export function makeCarMesh(color, kind) {
  const prof = PROFILES[kind === 'police' ? 'sedan' : kind] || PROFILES.sedan;
  const { length: L, width: W, axle } = prof;
  const isPolice = kind === 'police';
  // Livery rule (LOOK.md): a cruiser is white over navy whatever was asked.
  const paint = isPolice
    ? paintMaterial(0xf4f6f8)
    : kind === 'coupe' && color === HERO_COLOR
      ? paintMaterial(color, heroFinish)
      : paintMaterial(color);
  const g = new THREE.Group();

  const body = new THREE.Mesh(extrudeProfile(prof.body, W), paint);
  body.castShadow = true;
  g.add(body);
  g.add(new THREE.Mesh(extrudeProfile(prof.glass, W - 0.22, 0.02), glassMaterial));
  const [rx0, rx1, ry0, ry1] = prof.roof;
  const roofPts = [[rx0, ry0], [rx0 + 0.06, ry1], [rx1 - 0.06, ry1], [rx1, ry0]];
  g.add(new THREE.Mesh(extrudeProfile(roofPts, W - 0.16, 0.015), paint));

  const detail = [
    { geo: box(W - 0.06, 0.24, 0.22), color: 0x24282c, y: 0.34, z: L / 2 - 0.03 },
    { geo: box(W - 0.06, 0.24, 0.22), color: 0x24282c, y: 0.34, z: -L / 2 + 0.03 },
    { geo: box(1.1, 0.16, 0.06), color: 0x14161a, y: 0.52, z: L / 2 + 0.03 },
    { geo: box(0.09, 0.09, 0.2), color: 0x9aa2a8, x: 0.6, y: 0.2, z: -L / 2 - 0.04 },
    { geo: box(0.16, 0.1, 0.09), color: 0x24282c, x: W / 2 + 0.05, y: 1.0, z: 0.95 },
    { geo: box(0.16, 0.1, 0.09), color: 0x24282c, x: -W / 2 - 0.05, y: 1.0, z: 0.95 },
  ];
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    detail.push({
      geo: new THREE.CircleGeometry(0.53, 12), color: 0x101214,
      x: sx * (W / 2 + 0.006), y: 0.42, z: sz * axle, ry: sx * Math.PI / 2,
    });
    detail.push({ geo: box(0.05, 0.16, L * 0.5), color: 0x1d2023, x: sx * (W / 2 - 0.02), y: 0.24, z: 0 });
  }
  if (kind === 'coupe') {
    detail.push({ geo: box(1.5, 0.06, 0.36), color: 0x24282c, y: 1.0, z: -2.02 });
    detail.push({ geo: box(0.08, 0.16, 0.08), color: 0x24282c, x: 0.55, y: 0.9, z: -2.02 });
    detail.push({ geo: box(0.08, 0.16, 0.08), color: 0x24282c, x: -0.55, y: 0.9, z: -2.02 });
    // Cream racing stripes over bonnet, roof and deck: the hero's signature.
    detail.push({ geo: box(0.52, 0.03, 0.95), color: 0xf2e3c6, y: 0.845, z: 1.5, rx: -0.1 });
    detail.push({ geo: box(0.52, 0.025, 0.8), color: 0xf2e3c6, y: 1.275, z: 0.18 });
    detail.push({ geo: box(0.52, 0.03, 0.62), color: 0xf2e3c6, y: 0.865, z: -1.82, rx: 0.08 });
    detail.push({ geo: box(1.7, 0.09, 0.3), color: 0x1d2023, y: 0.22, z: 2.12 });
  }
  if (kind === 'pickup') {
    detail.push({ geo: box(W - 0.3, 0.08, 2.0), color: 0x2c2f33, y: 0.95, z: -1.38 });
    detail.push({ geo: box(W - 0.24, 0.3, 0.08), color: 0x3a3e42, y: 1.05, z: -0.42 });
  }
  if (isPolice) {
    for (const sx of [1, -1]) detail.push({ geo: box(0.05, 0.36, 3.3), color: 0x22406b, x: sx * (W / 2 + 0.004), y: 0.58, z: 0 });
    detail.push({ geo: box(1.5, 0.42, 0.14), color: 0x1d2023, y: 0.45, z: L / 2 + 0.14 });
    detail.push({ geo: box(1.3, 0.09, 0.5), color: 0x1d2023, y: 1.42, z: -0.05 });
  }
  g.add(new THREE.Mesh(mergeParts(detail), partMaterial));

  const lamps = new THREE.Mesh(mergeParts([
    { geo: box(0.36, 0.13, 0.05), color: 0xfff3b0, x: 0.58, y: 0.6, z: L / 2 + 0.04 },
    { geo: box(0.36, 0.13, 0.05), color: 0xfff3b0, x: -0.58, y: 0.6, z: L / 2 + 0.04 },
    { geo: box(0.38, 0.12, 0.05), color: 0xff2d20, x: 0.6, y: 0.64, z: -L / 2 - 0.04 },
    { geo: box(0.38, 0.12, 0.05), color: 0xff2d20, x: -0.6, y: 0.64, z: -L / 2 - 0.04 },
  ]), lampGlowMaterial);
  g.add(lamps);

  const wheels = [];
  for (const [wx, wz] of [[-0.84, axle], [0.84, axle], [-0.84, -axle], [0.84, -axle]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMaterial);
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;

  if (isPolice) {
    const lampMesh = (c) => {
      const m = new THREE.Mesh(box(0.58, 0.2, 0.44), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(0, 1.56, -0.05);
      g.add(m);
      return m;
    };
    const redLamp = lampMesh(0xff2222); redLamp.position.x = -0.33;
    const blueLamp = lampMesh(0x2266ff); blueLamp.position.x = 0.33;
    const beam = new THREE.PointLight(0xff3333, 0, 17, 2);
    beam.position.set(0, 1.8, 0);
    g.add(beam);
    // The reflection pool: an additive glow quad flat on the road under the
    // cruiser, tinted by whichever lamp is lit this half-cycle.
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 7.2),
      new THREE.MeshBasicMaterial({
        map: GLOW_TEX, color: 0xff3333, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.055;
    g.add(pool);
    g.userData.lightBar = [redLamp, blueLamp];
    g.userData.barLight = beam;
    g.userData.barPool = pool;
  }
  return g;
}

/** One drivable car: transform, speed, health, and who is driving it. */
export class Car {
  constructor(scene, x, z, heading, color, kind = 'sedan') {
    this.mesh = makeCarMesh(color, kind);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0; this.steer = 0; this.health = 100;
    this.kind = kind; this.occupied = false; this.dead = false;
    this.flashTimer = Math.random() * 6;
    this.onSkid = null; this._skidGap = 0;
  }

  get pos() { return this.mesh.position; }

  /** Arcade drive step. input: { throttle -1..1, steer -1..1, boost, brake }. */
  drive(dt, input, colliders, collideFn) {
    const accel = input.throttle * (input.boost ? 34 : 24);
    this.speed += accel * dt;
    if (input.brake) this.speed -= this.speed * 3.2 * dt;
    this.speed -= this.speed * 0.55 * dt; // drag
    this.speed = Math.max(-13, Math.min(input.boost ? 40 : 30, this.speed));
    this.steer += ((input.steer || 0) - this.steer) * Math.min(1, dt * 8);
    if (Math.abs(this.speed) > 0.4) {
      const grip = input.brake ? 1.7 : 1.05;
      this.heading -= this.steer * grip * dt * Math.sign(this.speed) * Math.min(1, Math.abs(this.speed) / 11);
    }
    // Handbrake drift lays rubber through the world's effects hook.
    this._skidGap -= dt;
    if (this.onSkid && input.brake && Math.abs(this.speed) > 9 && this._skidGap <= 0) {
      this._skidGap = 0.07;
      this.onSkid(this.x - Math.sin(this.heading) * 1.4, this.z - Math.cos(this.heading) * 1.4, this.heading);
    }
    let nx = this.x + Math.sin(this.heading) * this.speed * dt;
    let nz = this.z + Math.cos(this.heading) * this.speed * dt;
    if (colliders && collideFn) {
      const before = [nx, nz];
      [nx, nz] = collideFn(colliders, nx, nz, 1.7);
      if (Math.abs(nx - before[0]) > 0.01 || Math.abs(nz - before[1]) > 0.01) {
        this.speed *= 0.45;
        this.health -= Math.abs(this.speed) * 0.12;
        this.bumped = true;
      }
    }
    this.x = Math.max(-228, Math.min(228, nx));
    this.z = Math.max(-228, Math.min(258, nz));
    this.syncMesh(dt);
  }

  /** Parked / AI placement: set the transform, nothing else. */
  place(x, z, heading) {
    this.x = x; this.z = z; this.heading = heading;
    this.syncMesh(0);
  }

  syncMesh(dt) {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    if (dt > 0) {
      const roll = (this.speed * dt) / 0.42;
      for (const w of this.mesh.userData.wheels) w.rotation.x += roll;
    }
    const bar = this.mesh.userData.lightBar;
    if (bar) {
      this.flashTimer += dt * 7;
      const redPhase = Math.sin(this.flashTimer) > 0;
      bar[0].visible = redPhase;
      bar[1].visible = !redPhase;
      const beam = this.mesh.userData.barLight;
      if (beam) {
        beam.color.set(redPhase ? 0xff3333 : 0x3366ff);
        beam.intensity = 1.5;
      }
      // The pool on the asphalt breathes with the flash: brightest just
      // after the lamp swaps, easing until the next swap.
      const pool = this.mesh.userData.barPool;
      if (pool) {
        pool.material.color.set(redPhase ? 0xff2d20 : 0x2d6bff);
        pool.material.opacity = 0.34 + 0.14 * Math.abs(Math.sin(this.flashTimer));
      }
    }
    if (this.health <= 0 && !this.dead) {
      this.dead = true;
      this.mesh.rotation.z = 0.16;
    }
  }
}

const PARKED_KINDS = ['sedan', 'hatch', 'pickup', 'coupe', 'sedan', 'hatch'];

/** Parked cars along the beachfront and downtown, waiting to be stolen. */
export function spawnParkedCars(scene, rand) {
  const spots = [
    [-20, 160, 0.2], [24, 158, -0.15], [66, 160, 0.1], [-64, 158, 0], [110, 160, -0.2],
    [-2, -20, Math.PI / 2], [46, 24, 0], [-46, -66, Math.PI / 2], [90, -20, 0], [-90, 68, Math.PI],
    [2, 112, Math.PI / 2], [134, 24, 0], [-134, -20, Math.PI / 2], [22, -112, 0],
  ];
  return spots.map(([x, z, h], i) => new Car(scene, x, z, h,
    CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], PARKED_KINDS[i % PARKED_KINDS.length]));
}
