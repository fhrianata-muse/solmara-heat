// city.js — Solmara Bay: a sun-soaked coastal city built from boxes and planes.
// Road grid every ROAD_SPACING units, pastel towers with lit windows in the blocks,
// palm trees on the sidewalks, a sandy beach and blue ocean along the south edge,
// and a marina with little boats. Exports the building colliders the physics uses.

export const CITY_HALF = 220;          // playable ground extends to ±220
export const ROAD_SPACING = 44;
export const ROAD_WIDTH = 12;
export const BEACH_Z = 168;             // sand starts here, ocean beyond 196
export const PALETTE = [0xffd9a0, 0xffe9c9, 0xffb7a5, 0xa8d8ea, 0xf7e7ce, 0xcfe8b8, 0xf6c6d8, 0xfff3b0];

/** Deterministic seeded random so every visit (and every screenshot) builds the same city. */
export function seededRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** True when a point sits on a road (either direction of the grid). */
export function isRoad(x, z) {
  const gx = Math.abs(((x % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING);
  const gz = Math.abs(((z % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING);
  return gx < ROAD_WIDTH / 2 + 1 || gz < ROAD_WIDTH / 2 + 1 || z > BEACH_Z - 6;
}

/** Snap a coordinate to the centre line of the nearest road. */
export function roadCentre(v) { return Math.round(v / ROAD_SPACING) * ROAD_SPACING; }

function box(w, h, d, color, x, y, z, parent, emissive) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 }));
  m.position.set(x, y, z); parent.add(m); return m;
}

function makePalm(rand, x, z, parent) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 5.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x9a6b43 }));
  trunk.position.y = 2.8; trunk.rotation.z = (rand() - 0.5) * 0.22; g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.7), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.5, 5.8 + Math.sin(i * 2.3) * 0.25, Math.sin(a) * 1.5);
    leaf.rotation.y = -a; leaf.rotation.z = -0.42; g.add(leaf);
  }
  g.position.set(x, 0, z); parent.add(g);
}

function makeBuilding(rand, cx, cz, parent, colliders) {
  const w = 16 + rand() * 10, d = 16 + rand() * 10;
  const floors = 3 + Math.floor(rand() * 9);
  const h = floors * 3.1;
  const color = PALETTE[Math.floor(rand() * PALETTE.length)];
  box(w, h, d, color, cx, h / 2, cz, parent);
  box(w + 1.2, 0.7, d + 1.2, 0xffffff, cx, h + 0.35, cz, parent); // bright roof slab
  // Lit windows: one emissive plane per face made of a grid texture would cost a
  // texture; instead use small emissive boxes on the two street-facing sides.
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffe98a, emissive: 0xd9a83c, emissiveIntensity: 0.38 });
  const cols = Math.max(2, Math.floor(w / 4));
  const colsSide = Math.max(2, Math.floor(d / 4));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    if (rand() < 0.3) continue;
    const wx = cx - w / 2 + 2.2 + c * ((w - 4) / Math.max(1, cols - 1));
    const wy = 2 + f * 3.1;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.45, 0.15), winMat);
    win.position.set(wx, wy, cz + d / 2 + 0.09); parent.add(win);
    const win2 = win.clone(); win2.position.z = cz - d / 2 - 0.09; parent.add(win2);
  }
  for (let f = 0; f < floors; f++) for (let c = 0; c < colsSide; c++) {
    if (rand() < 0.35) continue;
    const wz = cz - d / 2 + 2.2 + c * ((d - 4) / Math.max(1, colsSide - 1));
    const wy = 2 + f * 3.1;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.45, 1.25), winMat);
    win.position.set(cx + w / 2 + 0.09, wy, wz); parent.add(win);
    const win2 = win.clone(); win2.position.x = cx - w / 2 - 0.09; parent.add(win2);
  }
  colliders.push({ x: cx, z: cz, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
}

function makeBoat(rand, x, z, parent) {
  const g = new THREE.Group();
  box(3.2, 1, 8, 0xffffff, 0, 0.6, 0, g);
  box(2.2, 1.1, 3, 0x3d9bd6, 0, 1.5, -0.6, g);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  mast.position.set(0, 3.6, 1.4); g.add(mast);
  g.position.set(x, 0.25, z); g.rotation.y = rand() * 0.8 - 0.4; parent.add(g);
}

/** Build the whole city into `scene`. Returns { colliders, palmPositions }. */
export function createCity(scene, seed) {
  const rand = seededRandom(seed);
  const colliders = [];
  const world = new THREE.Group(); scene.add(world);

  // Ground: warm pavement, then sand, then ocean.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 160, CITY_HALF * 2 + 160),
    new THREE.MeshLambertMaterial({ color: 0xb9c49a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; world.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 160, 60),
    new THREE.MeshLambertMaterial({ color: 0xf6dd9e }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.01, BEACH_Z + 26); world.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 220, 190),
    new THREE.MeshLambertMaterial({ color: 0x1f9ec4, emissive: 0x0a4a66, emissiveIntensity: 0.35 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.15, BEACH_Z + 56 + 95); world.add(ocean);

  // Roads: dark strips along both grid directions + a golden coastal highway.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xffd83d });
  for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(v, 0.02, 0); world.add(r);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.set(0, 0.02, v); world.add(r2);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, CITY_HALF * 2), lineMat);
    dash.rotation.x = -Math.PI / 2; dash.position.set(v, 0.035, 0); world.add(dash);
  }
  const coast = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 40, 13),
    new THREE.MeshLambertMaterial({ color: 0x54503e }));
  coast.rotation.x = -Math.PI / 2; coast.position.set(0, 0.03, BEACH_Z - 2); world.add(coast);

  // Buildings fill each block; palms line the sidewalks and the beachfront.
  const palmPositions = [];
  for (let bx = -CITY_HALF + 22; bx <= CITY_HALF - 30; bx += ROAD_SPACING) {
    for (let bz = -CITY_HALF + 22; bz <= CITY_HALF - 30; bz += ROAD_SPACING) {
      if (bz > BEACH_Z - ROAD_SPACING) continue;
      makeBuilding(rand, bx + ROAD_SPACING / 2, bz + ROAD_SPACING / 2, world, colliders);
      if (rand() < 0.85) { const px = bx + 8, pz = bz + 8; makePalm(rand, px, pz, world); palmPositions.push([px, pz]); }
      if (rand() < 0.6) { const px = bx + ROAD_SPACING - 8, pz = bz + ROAD_SPACING - 8; makePalm(rand, px, pz, world); palmPositions.push([px, pz]); }
    }
  }
  for (let x = -CITY_HALF + 6; x < CITY_HALF; x += 17) { // beachfront palms + umbrellas
    makePalm(rand, x, BEACH_Z + 9 + rand() * 8, world);
    if (rand() < 0.7) {
      const um = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1, 8),
        new THREE.MeshLambertMaterial({ color: PALETTE[Math.floor(rand() * PALETTE.length)] }));
      um.position.set(x + 5, 2.1, BEACH_Z + 16 + rand() * 12); world.add(um);
    }
  }
  // Marina: pier planks + boats bobbing in the south-east water.
  box(70, 0.6, 5, 0x8a6642, 120, 0.3, BEACH_Z + 40, world);
  for (let i = 0; i < 6; i++) makeBoat(rand, 92 + i * 12, BEACH_Z + 50 + (i % 2) * 9, world);

  return { colliders, palmPositions, ocean };
}

/** Circle-vs-buildings push-out: returns corrected [x, z]. */
export function collideBuildings(colliders, x, z, radius) {
  for (const c of colliders) {
    const dx = x - c.x, dz = z - c.z;
    const px = c.hw + radius - Math.abs(dx), pz = c.hd + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) x = c.x + (dx >= 0 ? c.hw + radius : -c.hw - radius);
      else z = c.z + (dz >= 0 ? c.hd + radius : -c.hd - radius);
    }
  }
  return [x, z];
}
