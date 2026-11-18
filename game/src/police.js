// police.js — the Solmara PD: wanted stars 1–5, patrol cruisers that chase and
// ram, and a police helicopter with a searchlight that joins at 3+ stars.

import { Car } from './vehicles.js';
import { collideBuildings } from './city.js';

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
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2456a6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 4.6), bodyMat); g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), bodyMat);
  tail.position.set(0, 0.25, -4.2); g.add(tail);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ef, emissive: 0x2a5a74 }));
  glass.position.set(0, 0.15, 1.9); g.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.15; g.add(rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 22, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6b8, transparent: true, opacity: 0.16, depthWrite: false }));
  cone.position.y = -11.6; g.add(cone);
  g.userData.rotor = rotor;
  return g;
}

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cruisers = [];
    this.heli = makeHelicopter();
    this.heli.visible = false; scene.add(this.heli);
    this.heliAngle = 0; this.spawnTimer = 0;
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
    }
  }
}
