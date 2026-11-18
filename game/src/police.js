// police.js — the Solmara PD: a wanted meter that turns crimes into stars,
// cruisers that spawn at the edge of sight and chase to ram, uniformed
// officers who step out once the heat is real, and — from 3 stars — a
// helicopter that circles with a live searchlight.

import { Car } from './vehicles.js';
import { collideBuildings } from './city.js';
import { buildPerson } from './pedestrians.js';
import { glassMaterial, paintMaterial } from './materials.js';

/**
 * Wanted state. Crimes add heat; every 55 heat becomes a star (max 5).
 * Lying low drains heat, and an empty meter sheds a star at a time.
 */
export class Wanted {
  constructor() {
    this.stars = 0;
    this.heat = 0;
    this.cooldown = 0;
  }

  /** Register a crime: steal 25, hit-and-run 30, gunshot 18, job heat 40+. */
  crime(amount) {
    this.heat += amount;
    this.cooldown = 14;
    while (this.heat >= 55 && this.stars < 5) {
      this.stars += 1;
      this.heat -= 55;
    }
    if (this.stars === 0 && this.heat > 20) this.stars = 1;
  }

  update(dt, hidden) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.heat -= dt * (hidden ? 9 : 2.2);
    if (this.heat <= 0) {
      this.heat = 0;
      if (this.stars > 0) {
        this.stars -= 1;
        this.heat = this.stars > 0 ? 40 : 0;
      }
    }
  }
}

/** The helicopter: extruded teardrop cabin, glass bubble, boom, skids, rotors. */
function buildHelicopter() {
  const g = new THREE.Group();
  const navy = paintMaterial(0x22406b);
  const outline = new THREE.Shape();
  outline.moveTo(-2.3, -0.5);
  outline.lineTo(-2.3, 0.55);
  outline.quadraticCurveTo(-1.0, 0.9, 1.0, 0.82);
  outline.quadraticCurveTo(2.2, 0.6, 2.35, 0.1);
  outline.quadraticCurveTo(2.4, -0.4, 1.6, -0.55);
  outline.lineTo(-2.3, -0.5);
  const cabinGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 1.7, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 1,
  });
  cabinGeo.translate(0, 0, -0.85);
  cabinGeo.rotateY(-Math.PI / 2);
  const cabin = new THREE.Mesh(cabinGeo, navy);
  cabin.castShadow = true;
  g.add(cabin);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8), glassMaterial);
  bubble.scale.set(0.92, 0.72, 1.05);
  bubble.position.set(0, 0.22, 1.55);
  g.add(bubble);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 4.4, 8), navy);
  boom.rotation.x = Math.PI / 2 - 0.06;
  boom.position.set(0, 0.42, -4.2);
  g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.62), navy);
  fin.position.set(0, 0.85, -6.3);
  g.add(fin);
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222528, roughness: 0.6 });
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.16), darkMetal);
  tailRotor.position.set(0.14, 0.85, -6.3);
  g.add(tailRotor);
  const skidMetal = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.6 });
  for (const sx of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), skidMetal);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 0.9, -1.05, 0.2);
    g.add(rail);
    for (const sz of [0.9, -0.6]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), skidMetal);
      strut.position.set(sx * 0.9, -0.75, sz);
      g.add(strut);
    }
  }
  const rotor = new THREE.Group();
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.06, 0.42), darkMetal);
  rotor.add(bladeA);
  const bladeB = bladeA.clone();
  bladeB.rotation.y = Math.PI / 2;
  rotor.add(bladeB);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.3, 8), skidMetal);
  rotor.add(hub);
  rotor.position.y = 1.12;
  g.add(rotor);
  // The visible cone of the searchlight (the real SpotLight lives in Police).
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 22, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6b8, transparent: true, opacity: 0.16, depthWrite: false }));
  cone.position.y = -11.6;
  g.add(cone);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  return g;
}

/** A uniformed officer: the shared rig in navy, cap brim as the cue. */
function buildOfficer() {
  const officer = buildPerson({
    shirt: 0x22406b, pants: 0x1b2a44, skin: 0xc68863, hair: 0x111111, hat: 1, bag: false,
  });
  officer.visible = false;
  return officer;
}

const CRUISERS_BY_STARS = [0, 1, 2, 3, 4, 5];

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cruisers = [];
    this.heli = buildHelicopter();
    this.heli.visible = false;
    scene.add(this.heli);
    this.heliAngle = 0;
    this.spawnTimer = 0;
    this.officers = [buildOfficer(), buildOfficer()];
    for (const o of this.officers) scene.add(o);
    this.spot = new THREE.SpotLight(0xfff2c0, 0, 95, 0.42, 0.55, 1);
    scene.add(this.spot);
    scene.add(this.spot.target);
  }

  update(dt, stars, target, colliders) {
    const wanted = CRUISERS_BY_STARS[stars] || 0;
    this.spawnTimer -= dt;
    if (this.cruisers.length < wanted && this.spawnTimer <= 0 && target) {
      this.spawnTimer = 2.5;
      const a = Math.random() * Math.PI * 2;
      this.cruisers.push(new Car(this.scene,
        target.x + Math.sin(a) * 55, target.z + Math.cos(a) * 55, a + Math.PI, 0x182848, 'police'));
    }
    if (this.cruisers.length > wanted + 1) {
      const retired = this.cruisers.pop();
      this.scene.remove(retired.mesh);
    }
    for (const cop of this.cruisers) {
      if (!target) { cop.syncMesh(dt); continue; }
      const dx = target.x - cop.x, dz = target.z - cop.z;
      const dist = Math.hypot(dx, dz);
      let diff = Math.atan2(dx, dz) - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const givingUp = dist > 90 && stars === 0;
      cop.drive(dt, {
        throttle: givingUp ? -0.4 : (dist > 7 ? 1 : 0.25),
        steer: Math.max(-1, Math.min(1, diff * 1.6)),
        boost: stars >= 4,
        brake: false,
      }, colliders, collideBuildings);
      if (stars === 0 && dist < 26) cop.speed *= 0.92; // chase over: they peel off
    }

    // Helicopter joins at 3+ stars and circles the target, light on.
    this.heli.visible = stars >= 3 && !!target;
    if (this.heli.visible) {
      this.heliAngle += dt * 0.55;
      this.heli.position.set(
        target.x + Math.cos(this.heliAngle) * 17, 23,
        target.z + Math.sin(this.heliAngle) * 17);
      this.heli.rotation.y = -this.heliAngle;
      this.heli.userData.rotor.rotation.y += dt * 28;
      this.heli.userData.tailRotor.rotation.x += dt * 34;
      this.spot.intensity = 1.7;
      this.spot.position.copy(this.heli.position);
      this.spot.target.position.set(target.x, 0, target.z);
      this.spot.target.updateMatrixWorld();
    } else {
      this.spot.intensity = 0;
    }

    // Officers stand beside the lead cruisers once the heat is real.
    this.officers.forEach((officer, i) => {
      const cop = this.cruisers[i];
      officer.visible = stars >= 3 && !!cop;
      if (!officer.visible) return;
      officer.position.set(
        cop.x + Math.cos(cop.heading) * 2.4, 0,
        cop.z - Math.sin(cop.heading) * 2.4);
      officer.rotation.y = cop.heading + Math.PI / 2;
    });
  }
}
