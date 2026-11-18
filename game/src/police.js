// police.js — the Solmara PD: wanted stars 1–5, patrol cruisers that chase and
// ram, and a police helicopter with a searchlight that joins at 3+ stars.

import { Car } from './vehicles.js';
import { collideBuildings } from './city.js';
import { buildPerson } from './pedestrians.js';
import { glassMaterial, paintMaterial } from './materials.js';

export class Wanted {
  constructor() { this.stars = 0; this.heat = 0; this.cooldown = 0; }
  /** Commit a crime of the given heat (steal 25, hit 30, shoot 18, job crime 40). */
  crime(amount) {
    this.heat += amount;
    this.cooldown = 14;
    while (this.heat >= 55 && this.stars < 5) { this.stars += 1; this.heat -= 55; }
    if (this.stars === 0 && this.heat > 20) this.stars = 1;
  }
  update(dt, hidden) {
    if (this.cooldown > 0) { this.cooldown -= dt; return; }
    if (hidden) this.heat -= dt * 9; else this.heat -= dt * 2.2;
    if (this.heat <= 0) { this.heat = 0; if (this.stars > 0) { this.stars -= 1; this.heat = this.stars > 0 ? 40 : 0; } }
  }
}

function makeHelicopter() {
  const g = new THREE.Group();
  const navy = paintMaterial(0x22406b);
  // Cabin: an extruded teardrop side profile, not a box.
  const shape = new THREE.Shape();
  shape.moveTo(-2.3, -0.5); shape.lineTo(-2.3, 0.55);
  shape.quadraticCurveTo(-1.0, 0.9, 1.0, 0.82);
  shape.quadraticCurveTo(2.2, 0.6, 2.35, 0.1);
  shape.quadraticCurveTo(2.4, -0.4, 1.6, -0.55);
  shape.lineTo(-2.3, -0.5);
  const cabinGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 1 });
  cabinGeo.translate(0, 0, -0.85); cabinGeo.rotateY(-Math.PI / 2);
  const cabin = new THREE.Mesh(cabinGeo, navy); cabin.castShadow = true; g.add(cabin);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8), glassMaterial);
  glass.scale.set(0.92, 0.72, 1.05); glass.position.set(0, 0.22, 1.55); g.add(glass);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 4.4, 8), navy);
  boom.rotation.x = Math.PI / 2 - 0.06; boom.position.set(0, 0.42, -4.2); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.62), navy);
  fin.position.set(0, 0.85, -6.3); g.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x222528, roughness: 0.6 }));
  tailRotor.position.set(0.14, 0.85, -6.3); g.add(tailRotor);
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.6 });
  for (const sx of [1, -1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), skidMat);
    skid.rotation.x = Math.PI / 2; skid.position.set(sx * 0.9, -1.05, 0.2); g.add(skid);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), skidMat);
    strut.position.set(sx * 0.9, -0.75, 0.9); g.add(strut);
    const strut2 = strut.clone(); strut2.position.z = -0.6; g.add(strut2);
  }
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.06, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x222528, roughness: 0.6 }));
  rotor.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.3, 8), skidMat);
  rotor.add(hub); rotor.position.y = 1.12; g.add(rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 22, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6b8, transparent: true, opacity: 0.16, depthWrite: false }));
  cone.position.y = -11.6; g.add(cone);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  return g;
}

/** A uniformed officer: navy rig + cap brim silhouette (CHARACTERS.md). */
function makeOfficer() {
  const g = buildPerson({ shirt: 0x22406b, pants: 0x1b2a44, skin: 0xc68863, hair: 0x111111, hat: 1, bag: false });
  g.visible = false;
  return g;
}

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cruisers = [];
    this.heli = makeHelicopter();
    this.heli.visible = false; scene.add(this.heli);
    this.heliAngle = 0; this.spawnTimer = 0;
    this.officers = [makeOfficer(), makeOfficer()];
    for (const o of this.officers) scene.add(o);
    // The searchlight is a real spotlight, not just a cone mesh.
    this.spot = new THREE.SpotLight(0xfff2c0, 0, 95, 0.42, 0.55, 1);
    scene.add(this.spot); scene.add(this.spot.target);
  }
  cruisersWanted(stars) { return [0, 1, 2, 3, 4, 5][stars] || 0; }
  update(dt, stars, target, colliders) {
    const want = this.cruisersWanted(stars);
    this.spawnTimer -= dt;
    if (this.cruisers.length < want && this.spawnTimer <= 0 && target) {
      this.spawnTimer = 2.5;
      const a = Math.random() * Math.PI * 2;
      const x = target.x + Math.sin(a) * 55, z = target.z + Math.cos(a) * 55;
      this.cruisers.push(new Car(this.scene, x, z, a + Math.PI, 0x182848, 'police'));
    }
    if (this.cruisers.length > Math.max(want, 0) + 1) {
      const extra = this.cruisers.pop();
      this.scene.remove(extra.mesh);
    }
    for (const cop of this.cruisers) {
      if (!target) { cop.syncMesh(dt); continue; }
      const dx = target.x - cop.x, dz = target.z - cop.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const far = dist > 90 && stars === 0;
      cop.drive(dt, {
        throttle: far ? -0.4 : (dist > 7 ? 1 : 0.25),
        steer: Math.max(-1, Math.min(1, diff * 1.6)),
        boost: stars >= 4, brake: false,
      }, colliders, collideBuildings);
      if (stars === 0 && dist < 26) { cop.speed *= 0.92; } // they give up and park the chase
    }
    // Helicopter: circles the target at 3+ stars, searchlight cone on.
    this.heli.visible = stars >= 3 && !!target;
    if (this.heli.visible) {
      this.heliAngle += dt * 0.55;
      const hx = target.x + Math.cos(this.heliAngle) * 17;
      const hz = target.z + Math.sin(this.heliAngle) * 17;
      this.heli.position.set(hx, 23, hz);
      this.heli.rotation.y = -this.heliAngle;
      this.heli.userData.rotor.rotation.y += dt * 28;
      this.heli.userData.tailRotor.rotation.x += dt * 34;
      this.spot.intensity = 1.7;
      this.spot.position.copy(this.heli.position);
      this.spot.target.position.set(target.x, 0, target.z);
      this.spot.target.updateMatrixWorld();
    } else this.spot.intensity = 0;
    // Officers step out beside the lead cruisers once the heat is real (3+).
    this.officers.forEach((officer, i) => {
      const cop = this.cruisers[i];
      officer.visible = stars >= 3 && !!cop;
      if (!officer.visible) return;
      officer.position.set(cop.x + Math.cos(cop.heading) * 2.4, 0, cop.z - Math.sin(cop.heading) * 2.4);
      officer.rotation.y = cop.heading + Math.PI / 2;
    });
  }
}
