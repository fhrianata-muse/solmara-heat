// pedestrians.js — walking citizens of Solmara Bay, built on one authored
// person rig: tapered torso, jointed arms and legs that swing, head with a
// hair cap, and silhouette variety from body scale, hats and bags — never
// recoloured clones of one box (CHARACTERS.md). They stroll the sidewalks
// and the beachfront, and they run when trouble starts near them.

import { CITY_HALF, BEACH_Z, seededRandom } from './city.js';
import { fabricMaterial, mergeParts, partMaterial } from './materials.js';

const SHIRTS = [0xff6b6b, 0xffd93d, 0x6bcbef, 0x95e06c, 0xff9ff3, 0xf8f4ec, 0xffa45c, 0x54d1db];
const PANTS = [0x34495e, 0x5d4a36, 0x2e4053, 0x707b7c, 0x784212];
const SKIN = [0xf2c89b, 0xc68863, 0x8d5524, 0xffdbac];
const HAIR = [0x2b1a12, 0x4a2c14, 0x111111, 0x8a8f96, 0xb5651d];

const limbGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.58, 7);
const legGeo = new THREE.CylinderGeometry(0.075, 0.055, 0.86, 7);

/** A limb hung from a shoulder/hip pivot so rotation.x swings it. */
function limb(geo, mat, x, y, drop) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = -drop; pivot.add(m);
  return pivot;
}

/**
 * The authored person: ~1.76 m before the group's own scale is applied.
 * opts: { shirt, pants, skin, hair, hat (0 none, 1 cap, 2 sun hat), bag }.
 * Returns a group whose userData holds the four limb pivots and setAim().
 */
export function buildPerson(opts) {
  const g = new THREE.Group();
  const shirt = fabricMaterial(opts.shirt), pants = fabricMaterial(opts.pants);
  const skin = fabricMaterial(opts.skin), hairM = fabricMaterial(opts.hair);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.205, 0.58, 9), shirt);
  torso.scale.set(1.3, 1, 0.82); torso.position.y = 1.14; torso.castShadow = true; g.add(torso);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.165, 0.2, 9), pants);
  hips.scale.set(1.25, 1, 0.8); hips.position.y = 0.88; g.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), skin);
  head.position.y = 1.6; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.162, 10, 6, 0, Math.PI * 2, 0, 1.85), hairM);
  hair.position.y = 1.615; g.add(hair);

  const extras = [];
  if (opts.hat === 1) { // cap: crown + brim, the police silhouette cue
    extras.push({ geo: new THREE.CylinderGeometry(0.165, 0.17, 0.09, 10), color: opts.shirt, y: 1.72 });
    extras.push({ geo: new THREE.BoxGeometry(0.24, 0.03, 0.18), color: opts.shirt, y: 1.68, z: 0.2 });
  } else if (opts.hat === 2) { // wide sun hat
    extras.push({ geo: new THREE.CylinderGeometry(0.3, 0.32, 0.035, 12), color: 0xf2e3c6, y: 1.7 });
    extras.push({ geo: new THREE.CylinderGeometry(0.15, 0.16, 0.1, 10), color: 0xf2e3c6, y: 1.74 });
  }
  if (opts.bag) { // beach/shopping bag on one side: silhouette, not colour
    extras.push({ geo: new THREE.BoxGeometry(0.1, 0.42, 0.3), color: 0xe8b54a, x: 0.36, y: 0.98, z: 0.02 });
  }
  if (extras.length) g.add(new THREE.Mesh(mergeParts(extras), partMaterial));

  const armL = limb(limbGeo, shirt, -0.29, 1.4, 0.27);
  const armR = limb(limbGeo, shirt, 0.29, 1.4, 0.27);
  const legL = limb(legGeo, pants, -0.11, 0.86, 0.42);
  const legR = limb(legGeo, pants, 0.11, 0.86, 0.42);
  g.add(armL, armR, legL, legR);
  g.userData = {
    legL, legR, armL, armR,
    /** Aim pose: right arm levelled forward (firing), left arm tucked. */
    setAim(on) { armR.rotation.x = on ? -Math.PI / 2 + 0.12 : 0; armL.rotation.x = on ? -0.5 : armL.rotation.x; },
  };
  return g;
}

function randomPerson(rand) {
  return buildPerson({
    shirt: SHIRTS[Math.floor(rand() * SHIRTS.length)],
    pants: PANTS[Math.floor(rand() * PANTS.length)],
    skin: SKIN[Math.floor(rand() * SKIN.length)],
    hair: HAIR[Math.floor(rand() * HAIR.length)],
    hat: rand() < 0.22 ? 2 : 0,
    bag: rand() < 0.3,
  });
}

export class Pedestrians {
  constructor(scene, rand, count = 26) {
    this.people = [];
    this.rand = rand;
    for (let i = 0; i < count; i++) {
      const mesh = randomPerson(rand);
      mesh.scale.setScalar(0.94 + rand() * 0.12); // 1.65-1.85 m across the crowd
      const onBeach = rand() < 0.3;
      const x = -CITY_HALF + 16 + rand() * (CITY_HALF * 2 - 32);
      const z = onBeach ? BEACH_Z - 12 + rand() * 22 : -CITY_HALF + 16 + rand() * (CITY_HALF * 2 - 50);
      mesh.position.set(x, 0, z); scene.add(mesh);
      this.people.push({
        mesh, x, z, heading: rand() * Math.PI * 2,
        speed: 1.6 + rand() * 1.3, phase: rand() * 6.28, panic: 0, health: 3, down: false,
      });
    }
  }
  /** danger: {x, z} of gunfire/chase — nearby people flee from it. */
  update(dt, danger) {
    for (const p of this.people) {
      if (p.down) continue;
      if (danger) {
        const dx = p.x - danger.x, dz = p.z - danger.z;
        const d = Math.hypot(dx, dz);
        if (d < 16) p.panic = 2.2;
        if (p.panic > 0 && d > 0.1) { p.heading = Math.atan2(dx, dz); }
      }
      p.panic = Math.max(0, p.panic - dt);
      const sp = p.speed * (p.panic > 0 ? 2.6 : 1);
      p.x += Math.sin(p.heading) * sp * dt;
      p.z += Math.cos(p.heading) * sp * dt;
      if (Math.abs(p.x) > CITY_HALF - 6 || p.z > BEACH_Z + 26 || p.z < -CITY_HALF + 6 || this.rand() < 0.002) {
        p.heading += Math.PI * (0.7 + this.rand() * 0.6);
        p.x = Math.max(-CITY_HALF + 6, Math.min(CITY_HALF - 6, p.x));
        p.z = Math.max(-CITY_HALF + 6, Math.min(BEACH_Z + 26, p.z));
      }
      p.phase += dt * sp * 3.4;
      const swing = Math.sin(p.phase) * 0.5;
      const u = p.mesh.userData;
      u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.75; u.armR.rotation.x = swing * 0.75;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.05, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }
  /** Knock a person down (shot or run over): they stop and tip over. */
  knockDown(p) { p.down = true; p.mesh.rotation.x = Math.PI / 2 - 0.12; p.mesh.position.y = 0.25; }
  nearest(x, z, maxDist) {
    let best = null, bd = maxDist;
    for (const p of this.people) { const d = Math.hypot(p.x - x, p.z - z); if (!p.down && d < bd) { bd = d; best = p; } }
    return best;
  }
}
export { seededRandom };
