// pedestrians.js — walking citizens of Solmara Bay: bright shirts, bobbing walk
// cycles on the sidewalks and the beachfront promenade. They stroll, and they
// run away screaming (well, silently) when trouble starts near them.

import { CITY_HALF, ROAD_SPACING, BEACH_Z, seededRandom } from './city.js';

const SHIRTS = [0xff6b6b, 0xffd93d, 0x6bcbef, 0x95e06c, 0xff9ff3, 0xf8f4ec, 0xffa45c, 0x54d1db];
const SKIN = [0xf2c89b, 0xc68863, 0x8d5524, 0xffdbac];

function makePerson(rand) {
  const g = new THREE.Group();
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.4),
    new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(rand() * SHIRTS.length)] }));
  shirt.position.y = 1.15; g.add(shirt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 7),
    new THREE.MeshLambertMaterial({ color: SKIN[Math.floor(rand() * SKIN.length)] }));
  head.position.y = 1.92; g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x34495e });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), legMat);
  legL.position.set(-0.18, 0.36, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
  g.userData = { legL, legR };
  return g;
}

export class Pedestrians {
  constructor(scene, rand, count = 26) {
    this.people = [];
    this.rand = rand;
    for (let i = 0; i < count; i++) {
      const mesh = makePerson(rand);
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
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.06, p.z);
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
