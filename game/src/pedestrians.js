// pedestrians.js — the people of Solmara Bay, and the one rig they all share.
//
// buildPerson() assembles a ~1.76 m figure from authored parts: tapered torso,
// a head with a hair cap, and arms/legs hung on pivot groups at the shoulder
// and hip so the walk cycle is real joint rotation, not a sliding texture.
// Variety comes from silhouette — body scale, sun hats, caps, carried bags —
// never from recolouring one box (CHARACTERS.md). Mara and the police
// officers are this same rig with different options, which is why everyone
// in the city moves like they belong to the same species.

import { CITY_HALF, BEACH_Z, seededRandom } from './city.js';
import { fabricMaterial, mergeParts, partMaterial } from './materials.js';

const SHIRT_TONES = [0xff6b6b, 0xffd93d, 0x6bcbef, 0x95e06c, 0xff9ff3, 0xf8f4ec, 0xffa45c, 0x54d1db];
const TROUSER_TONES = [0x34495e, 0x5d4a36, 0x2e4053, 0x707b7c, 0x784212];
const SKIN_TONES = [0xf2c89b, 0xc68863, 0x8d5524, 0xffdbac];
const HAIR_TONES = [0x2b1a12, 0x4a2c14, 0x111111, 0x8a8f96, 0xb5651d];

// Segment lengths in metres; they add up to the 1.76 m rig height.
const LEG_LEN = 0.84, HIP_Y = 0.88, SHOULDER_Y = 1.42, ARM_LEN = 0.6;

const armGeo = new THREE.CylinderGeometry(0.052, 0.045, ARM_LEN, 7);
const legGeo = new THREE.CylinderGeometry(0.072, 0.052, LEG_LEN, 7);
const shoeGeo = new THREE.BoxGeometry(0.11, 0.07, 0.24);

/** A limb on a pivot: geometry hangs below the joint so rotation.x swings it. */
function hangLimb(geo, mat, jointX, jointY, withShoe, clothMat) {
  const joint = new THREE.Group();
  joint.position.set(jointX, jointY, 0);
  const bone = new THREE.Mesh(geo, mat);
  bone.position.y = -geo.parameters.height / 2 + 0.02;
  joint.add(bone);
  if (withShoe) {
    const shoe = new THREE.Mesh(shoeGeo, clothMat);
    shoe.position.set(0, -LEG_LEN + 0.03, 0.05);
    joint.add(shoe);
  }
  return joint;
}

/**
 * Build one person. opts: { shirt, pants, skin, hair,
 * hat: 0 none | 1 peaked cap | 2 wide sun hat, bag: bool }.
 * userData carries the four limb pivots and setAim(on) for the firing pose.
 */
export function buildPerson(opts) {
  const figure = new THREE.Group();
  const shirtM = fabricMaterial(opts.shirt), pantsM = fabricMaterial(opts.pants);
  const skinM = fabricMaterial(opts.skin), hairM = fabricMaterial(opts.hair);
  const darkM = fabricMaterial(0x24282c);

  // Torso: a squashed tapered cylinder reads as shoulders-over-hips, not a tube.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.2, 0.56, 9), shirtM);
  torso.scale.set(1.32, 1, 0.8);
  torso.position.y = 1.16;
  torso.castShadow = true;
  figure.add(torso);
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.2, 9), pantsM);
  pelvis.scale.set(1.26, 1, 0.78);
  pelvis.position.y = 0.9;
  figure.add(pelvis);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.152, 10, 8), skinM);
  skull.position.y = 1.615;
  skull.castShadow = true;
  figure.add(skull);
  // Hair: a partial sphere shell sitting high and back on the skull.
  const hairShell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, 1.8), hairM);
  hairShell.position.set(0, 1.63, -0.012);
  figure.add(hairShell);

  // Hats and bags are merged vertex-coloured parts: silhouette, cheaply.
  const extras = [];
  if (opts.hat === 1) {
    extras.push({ geo: new THREE.CylinderGeometry(0.163, 0.168, 0.085, 10), color: opts.shirt, y: 1.735 });
    extras.push({ geo: new THREE.BoxGeometry(0.23, 0.028, 0.17), color: opts.shirt, y: 1.685, z: 0.19 });
  } else if (opts.hat === 2) {
    extras.push({ geo: new THREE.CylinderGeometry(0.3, 0.33, 0.032, 12), color: 0xf2e3c6, y: 1.705 });
    extras.push({ geo: new THREE.CylinderGeometry(0.148, 0.158, 0.1, 10), color: 0xf2e3c6, y: 1.75 });
  }
  if (opts.bag) {
    extras.push({ geo: new THREE.BoxGeometry(0.1, 0.4, 0.29), color: 0xe8b54a, x: 0.37, y: 0.99, z: 0.02 });
    extras.push({ geo: new THREE.BoxGeometry(0.1, 0.16, 0.05), color: 0x8a6642, x: 0.37, y: 1.24, z: 0.02 });
  }
  if (extras.length) figure.add(new THREE.Mesh(mergeParts(extras), partMaterial));

  const armL = hangLimb(armGeo, shirtM, -0.285, SHOULDER_Y, false);
  const armR = hangLimb(armGeo, shirtM, 0.285, SHOULDER_Y, false);
  const legL = hangLimb(legGeo, pantsM, -0.105, HIP_Y, true, darkM);
  const legR = hangLimb(legGeo, pantsM, 0.105, HIP_Y, true, darkM);
  figure.add(armL, armR, legL, legR);
  figure.userData = {
    legL, legR, armL, armR,
    /** Firing pose: right arm level, left arm bent across the body. */
    setAim(on) {
      armR.rotation.x = on ? -Math.PI / 2 + 0.1 : armR.rotation.x;
      if (on) armL.rotation.x = -0.55;
    },
  };
  return figure;
}

function randomCitizen(rand) {
  return buildPerson({
    shirt: SHIRT_TONES[Math.floor(rand() * SHIRT_TONES.length)],
    pants: TROUSER_TONES[Math.floor(rand() * TROUSER_TONES.length)],
    skin: SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)],
    hair: HAIR_TONES[Math.floor(rand() * HAIR_TONES.length)],
    hat: rand() < 0.22 ? 2 : 0,
    bag: rand() < 0.3,
  });
}

export class Pedestrians {
  constructor(scene, rand, count = 26) {
    this.rand = rand;
    this.people = [];
    for (let i = 0; i < count; i++) {
      const mesh = randomCitizen(rand);
      mesh.scale.setScalar(0.94 + rand() * 0.12); // crowd spans 1.65–1.85 m
      const beachgoer = rand() < 0.3;
      const x = -CITY_HALF + 16 + rand() * (CITY_HALF * 2 - 32);
      const z = beachgoer
        ? BEACH_Z - 12 + rand() * 22
        : -CITY_HALF + 16 + rand() * (CITY_HALF * 2 - 50);
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.people.push({
        mesh, x, z,
        heading: rand() * Math.PI * 2,
        stride: 1.6 + rand() * 1.3,
        phase: rand() * Math.PI * 2,
        panic: 0, health: 3, down: false,
      });
    }
  }

  /** danger: an {x, z} the crowd should run from (gunfire, a chase). */
  update(dt, danger) {
    for (const p of this.people) {
      if (p.down) continue;
      if (danger) {
        const dx = p.x - danger.x, dz = p.z - danger.z;
        const d = Math.hypot(dx, dz);
        if (d < 16) p.panic = 2.2;
        if (p.panic > 0 && d > 0.1) p.heading = Math.atan2(dx, dz);
      }
      p.panic = Math.max(0, p.panic - dt);
      const speed = p.stride * (p.panic > 0 ? 2.6 : 1);
      p.x += Math.sin(p.heading) * speed * dt;
      p.z += Math.cos(p.heading) * speed * dt;
      const hitEdge = Math.abs(p.x) > CITY_HALF - 6 || p.z > BEACH_Z + 26 || p.z < -CITY_HALF + 6;
      if (hitEdge || this.rand() < 0.002) {
        p.heading += Math.PI * (0.7 + this.rand() * 0.6);
        p.x = Math.max(-CITY_HALF + 6, Math.min(CITY_HALF - 6, p.x));
        p.z = Math.max(-CITY_HALF + 6, Math.min(BEACH_Z + 26, p.z));
      }
      p.phase += dt * speed * 3.4;
      const swing = Math.sin(p.phase) * 0.5;
      const u = p.mesh.userData;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.75;
      u.armR.rotation.x = swing * 0.75;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.05, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }

  /** Shot or run over: tip over where they stand and stop moving. */
  knockDown(p) {
    p.down = true;
    p.mesh.rotation.x = Math.PI / 2 - 0.12;
    p.mesh.position.y = 0.25;
  }

  nearest(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const p of this.people) {
      if (p.down) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
}

export { seededRandom };
