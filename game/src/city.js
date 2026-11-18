// city.js — Solmara Bay, authored: deco towers with cornice and plinth trim
// merged into a single mesh, step-back crowns on the tall ones, instanced
// palms with curved trunks and frond clusters, instanced lamps and benches,
// extruded marina boats, and roads merged into one mesh per surface.
// Exports the building colliders the physics uses.

import {
  mergeParts, partMaterial, paintMaterial, glassMaterial, tileUV,
  asphaltTexture, sidewalkTexture, sandTexture, waterTexture, facadeTexture, woodTexture, signTexture,
} from './materials.js';

export const CITY_HALF = 220;          // playable ground extends to ±220
export const ROAD_SPACING = 44;
export const ROAD_WIDTH = 12;
export const BEACH_Z = 168;             // sand starts here, ocean beyond 196

// Design constants in metres (game_dev_workflow Phase 1: guessed proportions
// look like a toy however detailed the result). Everything in the city is
// sized from these, and CHARACTERS.md sizes every actor from them too.
export const STOREY_M = 3.1;            // one building floor, floor to floor
export const DOOR_M = 2.2;              // a doorway a 1.8 m person walks through
export const PERSON_M = 1.76;           // reference adult height
export const CAR_LENGTH_M = 4.4;        // hero coupe; sedan 4.5, hatch 3.9, pickup 5.0
export const CAR_WIDTH_M = 1.85;
export const PALM_M = 6.2;              // trunk top where the fronds start
export const LANE_M = 3;                // traffic lane offset from a road centre line

export const PALETTE = [0xf2e3c6, 0xf08a6b, 0x3fa7a0, 0xe8b54a, 0xffd9a0, 0xf6c6d8, 0xcfe8b8, 0xa8d8ea];
const DECO_TRIM = 0xf7efdd;

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

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const std = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

// Surface materials wear the seeded canvas textures from materials.js:
// asphalt wear, sidewalk slabs, deco facades, sand, sparkling water.
export const groundMaterial = new THREE.MeshStandardMaterial({ map: sidewalkTexture(), roughness: 0.95, metalness: 0 });
export const roadMaterial = new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.94, metalness: 0 });
export const dashMaterial = std(0xf5f2e8, 0.8);
export const sandMaterial = new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1, metalness: 0 });
export const oceanMaterial = new THREE.MeshStandardMaterial({
  map: waterTexture(), roughness: 0.32, metalness: 0.1, emissive: 0x0a3d52, emissiveIntensity: 0.35,
});
const FACADE_TEX = facadeTexture();

/** One building: textured-ready box + a step-back crown on tall towers. */
function makeBuilding(rand, cx, cz, parent, colliders, trimParts) {
  const w = 16 + rand() * 10, d = 16 + rand() * 10;
  const floors = 3 + Math.floor(rand() * 9);
  const h = floors * STOREY_M;
  const color = PALETTE[Math.floor(rand() * PALETTE.length)];
  const tex = FACADE_TEX.clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(w / 10.4)), Math.max(1, Math.round(floors / 3)));
  const mat = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.85, metalness: 0 });
  const body = new THREE.Mesh(box(w, h, d), mat);
  body.position.set(cx, h / 2, cz); body.castShadow = true; body.receiveShadow = true;
  parent.add(body);
  // Cornice crown + ground-floor plinth go into the one merged trim mesh.
  trimParts.push({ geo: box(w + 1.1, 0.55, d + 1.1), color: DECO_TRIM, x: cx, y: h + 0.27, z: cz });
  trimParts.push({ geo: box(w + 0.5, 1.15, d + 0.5), color: 0x8d8578, x: cx, y: 0.57, z: cz });
  if (floors >= 8) { // deco step-back: a narrower crown storey on tall towers
    const cw = w * 0.68, cd = d * 0.68;
    const crown = new THREE.Mesh(box(cw, STOREY_M, cd), mat);
    crown.position.set(cx, h + STOREY_M / 2 + 0.5, cz); crown.castShadow = true; parent.add(crown);
    trimParts.push({ geo: box(cw + 0.9, 0.45, cd + 0.9), color: DECO_TRIM, x: cx, y: h + STOREY_M + 0.72, z: cz });
  }
  if (floors >= 9 && rand() < 0.55) { // rooftop water tower: skyline signature
    const ty = h + (floors >= 8 ? STOREY_M + 0.5 : 0);
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      trimParts.push({ geo: box(0.14, 1.3, 0.14), color: 0x6e5638, x: cx + lx, y: ty + 0.65, z: cz + lz });
    }
    trimParts.push({ geo: new THREE.CylinderGeometry(1.15, 1.15, 1.9, 10), color: 0xb08954, x: cx, y: ty + 2.25, z: cz });
    trimParts.push({ geo: new THREE.ConeGeometry(1.35, 0.75, 10), color: 0xe2483d, x: cx, y: ty + 3.55, z: cz });
  }
  colliders.push({ x: cx, z: cz, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
  return { x: cx, z: cz, w, d, h, floors };
}

/** Awnings: one instanced mesh of slanted slabs over the ground floors. */
function makeAwnings(buildings, parent) {
  const geo = box(3.4, 0.09, 1.25);
  const mesh = new THREE.InstancedMesh(geo,
    new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }), buildings.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const deco = [0xf08a6b, 0x3fa7a0, 0xe8b54a, 0xe2483d];
  let n = 0;
  buildings.forEach((b, i) => {
    for (const side of [1, -1]) {
      e.set(-0.42 * side, 0, 0); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(b.x + (i % 3 - 1) * 3.4, 2.9, b.z + side * (b.d / 2 + 0.55)), q,
        new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(n, m4);
      mesh.setColorAt(n, new THREE.Color(deco[(i + (side > 0 ? 0 : 1)) % deco.length]));
      n++;
    }
  });
  mesh.count = n; mesh.castShadow = true;
  parent.add(mesh);
}

/** Roof clutter (AC boxes) instanced across every roof in one draw. */
function makeRoofUnits(buildings, rand, parent) {
  const mesh = new THREE.InstancedMesh(box(1.6, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xb9beb9, roughness: 0.7, metalness: 0.3 }), buildings.length);
  const m4 = new THREE.Matrix4();
  buildings.forEach((b, i) => {
    m4.makeRotationY(rand() * Math.PI);
    m4.setPosition(b.x + (rand() - 0.5) * b.w * 0.4, b.h + 0.95, b.z + (rand() - 0.5) * b.d * 0.4);
    mesh.setMatrixAt(i, m4);
  });
  parent.add(mesh);
}

/** Bent palm trunk geometry: vertices lean further the higher they climb. */
function palmTrunkGeo() {
  const geo = new THREE.CylinderGeometry(0.15, 0.3, PALM_M, 7, 6);
  geo.translate(0, PALM_M / 2, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / PALM_M;
    p.setX(i, p.getX(i) + t * t * 1.1);
  }
  geo.computeVertexNormals();
  return geo;
}

/** One frond cluster: seven drooping, tapering fronds merged around a crown. */
function palmFrondGeo() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.PlaneGeometry(3.6, 0.8, 6, 1);
    frond.rotateX(-Math.PI / 2); // lay it flat: length along +x, width along z
    const p = frond.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), t = (x + 1.8) / 3.6;
      p.setX(v, x + 1.8);
      p.setY(v, -t * t * 1.05 + 0.18);            // rises off the crown, then droops
      p.setZ(v, p.getZ(v) * (1 - t * 0.78));     // taper to a point
    }
    frond.computeVertexNormals();
    parts.push({ geo: frond, color: 0x3e9b4f, ry: (i / 7) * Math.PI * 2 });
  }
  for (let i = 0; i < 3; i++) {
    parts.push({ geo: new THREE.SphereGeometry(0.15, 6, 5), color: 0x8a6b4a,
      x: Math.cos(i * 2.1) * 0.18, y: -0.12, z: Math.sin(i * 2.1) * 0.18 });
  }
  return mergeParts(parts);
}

function makePalms(spots, parent) {
  const trunk = new THREE.InstancedMesh(palmTrunkGeo(),
    new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 }), spots.length);
  const fronds = new THREE.InstancedMesh(palmFrondGeo(), partMaterial, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const top = new THREE.Vector3();
  spots.forEach(([x, z, s, ry], i) => {
    e.set(0, ry, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
    trunk.setMatrixAt(i, m4);
    top.set(1.1 * s, PALM_M * s, 0).applyQuaternion(q);
    m4.compose(new THREE.Vector3(x + top.x, top.y, z + top.z), q, new THREE.Vector3(s, s, s));
    fronds.setMatrixAt(i, m4);
  });
  trunk.castShadow = true;
  parent.add(trunk, fronds);
  return spots.map(([x, z]) => [x, z]);
}

const lampGeo = mergeParts([
  { geo: new THREE.CylinderGeometry(0.07, 0.09, 5.2, 7), color: 0x3a4149, y: 2.6 },
  { geo: box(0.09, 0.09, 1.15), color: 0x3a4149, y: 5.15, z: 0.5 },
  { geo: box(0.52, 0.1, 0.26), color: 0xffe9b0, y: 5.05, z: 1.0 },
]);
const benchGeo = mergeParts([
  { geo: box(1.8, 0.09, 0.5), color: 0x8a6642, y: 0.46 },
  { geo: box(1.8, 0.5, 0.08), color: 0x8a6642, y: 0.82, z: -0.24, rx: -0.16 },
  { geo: box(0.09, 0.46, 0.45), color: 0x3a4149, x: 0.75, y: 0.23 },
  { geo: box(0.09, 0.46, 0.45), color: 0x3a4149, x: -0.75, y: 0.23 },
]);

function makeInstanced(geo, spots, parent, shadow = false) {
  const mesh = new THREE.InstancedMesh(geo, partMaterial, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  spots.forEach(([x, z, ry], i) => {
    e.set(0, ry || 0, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m4);
  });
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

/** Marina boat: extruded hull silhouette, glass cabin, mast. Bobs in simulate. */
function makeBoat(rand, x, z, parent) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-3.6, 0.95); shape.lineTo(-3.6, 0.2);
  shape.quadraticCurveTo(0, -0.35, 3.3, 0.45);
  shape.quadraticCurveTo(3.9, 0.8, 3.95, 1.05);
  shape.lineTo(-3.6, 0.95);
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 });
  hullGeo.translate(0, 0, -1.15); hullGeo.rotateY(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, paintMaterial(0xf4f6f8));
  hull.castShadow = true; g.add(hull);
  const cabin = new THREE.Mesh(box(1.7, 0.85, 2.6), glassMaterial);
  cabin.position.set(0, 1.35, -0.4); g.add(cabin);
  const roofB = new THREE.Mesh(box(2.0, 0.12, 3.0), paintMaterial(0x3fa7a0));
  roofB.position.set(0, 1.85, -0.4); g.add(roofB);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8dee2, roughness: 0.4, metalness: 0.7 }));
  mast.position.set(0, 3.8, 1.2); g.add(mast);
  g.position.set(x, 0.3, z); g.rotation.y = rand() * 0.8 - 0.4;
  parent.add(g);
  return g;
}

/** A painted place-name sign on two posts: identity you can read in a frame. */
function makeSign(text, bg, fg, x, z, ry, parent) {
  const g = new THREE.Group();
  const posts = new THREE.Mesh(mergeParts([
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), color: 0x3a4149, x: -2.2, y: 1.3 },
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), color: 0x3a4149, x: 2.2, y: 1.3 },
  ]), partMaterial);
  g.add(posts);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4),
    new THREE.MeshStandardMaterial({ map: signTexture(text, bg, fg), roughness: 0.7, side: THREE.DoubleSide }));
  board.position.y = 2.9; board.castShadow = true; g.add(board);
  g.position.set(x, 0, z); g.rotation.y = ry;
  parent.add(g);
}

/** Build the whole city into `scene`. Returns colliders, boats and surfaces. */
export function createCity(scene, seed) {
  const rand = seededRandom(seed);
  const colliders = [];
  const world = new THREE.Group(); scene.add(world);

  const ground = new THREE.Mesh(tileUV(new THREE.PlaneGeometry(CITY_HALF * 2 + 160, CITY_HALF * 2 + 160), 150, 150), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; world.add(ground);
  const sand = new THREE.Mesh(tileUV(new THREE.PlaneGeometry(CITY_HALF * 2 + 160, 62), 100, 10), sandMaterial);
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.01, BEACH_Z + 27); sand.receiveShadow = true; world.add(sand);
  const ocean = new THREE.Mesh(tileUV(new THREE.PlaneGeometry(CITY_HALF * 2 + 220, 190), 90, 26), oceanMaterial);
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.15, BEACH_Z + 56 + 95); world.add(ocean);

  // All road strips merged into one mesh; centre dashes into another.
  // UVs are tiled per strip so the asphalt patch repeats every 12 m.
  const roadParts = [], dashParts = [];
  for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING) {
    roadParts.push({ geo: tileUV(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), 1, 36), color: 0xffffff, x: v, y: 0.02, z: 0, rx: -Math.PI / 2 });
    roadParts.push({ geo: tileUV(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), 36, 1), color: 0xffffff, x: 0, y: 0.02, z: v, rx: -Math.PI / 2 });
    dashParts.push({ geo: new THREE.PlaneGeometry(0.45, CITY_HALF * 2), color: 0xffffff, x: v, y: 0.035, z: 0, rx: -Math.PI / 2 });
    dashParts.push({ geo: new THREE.PlaneGeometry(CITY_HALF * 2, 0.45), color: 0xffffff, x: 0, y: 0.035, z: v, rx: -Math.PI / 2 });
  }
  const roads = new THREE.Mesh(mergeParts(roadParts), roadMaterial);
  roads.receiveShadow = true; world.add(roads);
  const coast = new THREE.Mesh(tileUV(new THREE.PlaneGeometry(CITY_HALF * 2 + 40, 13), 40, 1), roadMaterial);
  coast.rotation.x = -Math.PI / 2; coast.position.set(0, 0.03, BEACH_Z - 2); coast.receiveShadow = true; world.add(coast);
  world.add(new THREE.Mesh(mergeParts(dashParts), dashMaterial));

  // Buildings fill each block; their trim merges into one mesh for the city.
  const trimParts = [], buildings = [], palmSpots = [];
  for (let bx = -CITY_HALF + 22; bx <= CITY_HALF - 30; bx += ROAD_SPACING) {
    for (let bz = -CITY_HALF + 22; bz <= CITY_HALF - 30; bz += ROAD_SPACING) {
      if (bz > BEACH_Z - ROAD_SPACING) continue;
      buildings.push(makeBuilding(rand, bx + ROAD_SPACING / 2, bz + ROAD_SPACING / 2, world, colliders, trimParts));
      if (rand() < 0.85) palmSpots.push([bx + 8, bz + 8, 0.9 + rand() * 0.3, rand() * Math.PI * 2]);
      if (rand() < 0.6) palmSpots.push([bx + ROAD_SPACING - 8, bz + ROAD_SPACING - 8, 0.9 + rand() * 0.3, rand() * Math.PI * 2]);
    }
  }
  const trim = new THREE.Mesh(mergeParts(trimParts), partMaterial);
  trim.castShadow = true; world.add(trim);
  makeAwnings(buildings, world);
  makeRoofUnits(buildings, rand, world);

  // Beachfront: palms, umbrellas with towels, benches facing the water.
  const umbrellaParts = [], benchSpots = [];
  for (let x = -CITY_HALF + 6; x < CITY_HALF; x += 17) {
    palmSpots.push([x, BEACH_Z + 9 + rand() * 8, 0.95 + rand() * 0.35, rand() * Math.PI * 2]);
    if (rand() < 0.7) {
      const ux = x + 5, uz = BEACH_Z + 16 + rand() * 12;
      const col = PALETTE[Math.floor(rand() * PALETTE.length)];
      umbrellaParts.push({ geo: new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5), color: 0xd8dee2, x: ux, y: 1.15, z: uz });
      umbrellaParts.push({ geo: new THREE.ConeGeometry(2.4, 0.95, 8), color: col, x: ux, y: 2.35, z: uz });
      umbrellaParts.push({ geo: new THREE.PlaneGeometry(1.9, 0.8), color: col, x: ux + 1.4, y: 0.06, z: uz + 0.8, rx: -Math.PI / 2 });
    }
    if (rand() < 0.5) benchSpots.push([x + 9, BEACH_Z + 4, Math.PI]);
  }
  for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING * 2) {
    benchSpots.push([v + 9, -2, 0], [2, v + 9, Math.PI / 2]);
  }
  world.add(new THREE.Mesh(mergeParts(umbrellaParts), partMaterial));
  // Lifeguard stands watching the swimming beach: white frame, coral roof.
  const guardParts = [];
  for (const gx of [0, 90]) {
    const gz = BEACH_Z + 15;
    for (const [lx, lz] of [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]]) {
      guardParts.push({ geo: box(0.12, 2.4, 0.12), color: 0xf4f6f8, x: gx + lx, y: 1.2, z: gz + lz, rz: lx * 0.18, rx: -lz * 0.18 });
    }
    guardParts.push({ geo: box(1.9, 0.14, 1.5), color: 0xf4f6f8, x: gx, y: 2.45, z: gz });
    guardParts.push({ geo: box(1.7, 0.7, 0.1), color: 0xf4f6f8, x: gx, y: 2.9, z: gz - 0.65 });
    guardParts.push({ geo: new THREE.ConeGeometry(1.6, 0.6, 4), color: 0xe2483d, x: gx, y: 3.6, z: gz, ry: Math.PI / 4 });
  }
  const guards = new THREE.Mesh(mergeParts(guardParts), partMaterial);
  guards.castShadow = true; world.add(guards);
  makeInstanced(benchGeo, benchSpots, world);
  const palmPositions = makePalms(palmSpots, world);

  // Street lamps along every road, alternating sides.
  const lampSpots = [];
  for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING) {
    for (let t = -CITY_HALF + 20; t < CITY_HALF - 10; t += ROAD_SPACING) {
      lampSpots.push([v + 7.5, t, Math.PI / 2], [t, v - 7.5, Math.PI]);
    }
  }
  makeInstanced(lampGeo, lampSpots, world);

  // Marina: pier + boats + painted signs that name the place.
  const woodTex = woodTexture(); woodTex.repeat.set(10, 1);
  const pier = new THREE.Mesh(box(70, 0.6, 5), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.95 }));
  pier.position.set(120, 0.3, BEACH_Z + 40); pier.castShadow = true; world.add(pier);
  makeSign('SOLMARA MARINA', '#3fa7a0', '#f2e3c6', 96, BEACH_Z + 33, 0, world);
  makeSign('PALMS ROW', '#f08a6b', '#f2e3c6', -149.5, 141, 0, world);
  const boats = [];
  for (let i = 0; i < 6; i++) boats.push(makeBoat(rand, 92 + i * 12, BEACH_Z + 50 + (i % 2) * 9, world));

  return { colliders, palmPositions, ocean, boats };
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
