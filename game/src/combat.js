// combat.js — Mara's little equaliser: a simple on-foot/in-car weapon with a
// muzzle flash, a tracer line, and damage to people and cars. Firing is loud:
// pedestrians panic and the wanted level climbs.

export class Combat {
  constructor(scene) {
    this.cooldown = 0;
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe98a }));
    this.flash.visible = false; scene.add(this.flash);
    this.tracer = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1),
      new THREE.MeshBasicMaterial({ color: 0xffd83d }));
    this.tracer.visible = false; scene.add(this.tracer);
    this.flashTime = 0;
    this.lastShotAt = null;   // {x, z} — pedestrians flee from here
  }
  /**
   * Fire from `origin` toward `dir` (unit, horizontal). Tests pedestrians and
   * cars along the ray. Returns 'person' | 'car' | null for what was hit.
   */
  fire(origin, dir, pedestrians, cars, wanted, audio) {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.22; this.flashTime = 0.06;
    this.lastShotAt = { x: origin.x, z: origin.z };
    wanted.crime(18);
    if (audio) audio.shot();
    const muzzle = { x: origin.x + dir.x * 1.1, z: origin.z + dir.z * 1.1 };
    this.flash.position.set(muzzle.x, 1.35, muzzle.z); this.flash.visible = true;
    let bestT = 42, hit = null, hitKind = null;
    for (const p of pedestrians.people) {
      if (p.down) continue;
      const t = (p.x - origin.x) * dir.x + (p.z - origin.z) * dir.z;
      if (t < 0 || t > bestT) continue;
      const side = Math.abs((p.x - origin.x) * dir.z - (p.z - origin.z) * dir.x);
      if (side < 0.9) { bestT = t; hit = p; hitKind = 'person'; }
    }
    for (const car of cars) {
      if (car.dead) continue;
      const t = (car.x - origin.x) * dir.x + (car.z - origin.z) * dir.z;
      if (t < 0 || t > bestT) continue;
      const side = Math.abs((car.x - origin.x) * dir.z - (car.z - origin.z) * dir.x);
      if (side < 2.1) { bestT = t; hit = car; hitKind = 'car'; }
    }
    const end = { x: origin.x + dir.x * bestT, z: origin.z + dir.z * bestT };
    this.tracer.visible = true;
    this.tracer.scale.z = bestT;
    this.tracer.position.set((muzzle.x + end.x) / 2, 1.3, (muzzle.z + end.z) / 2);
    this.tracer.rotation.y = Math.atan2(dir.x, dir.z);
    if (hitKind === 'person') { hit.health -= 2; if (hit.health <= 0) { pedestrians.knockDown(hit); wanted.crime(22); } }
    if (hitKind === 'car') { hit.health -= 14; if (hit.kind === 'police') wanted.crime(15); }
    return hitKind;
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flashTime -= dt;
    if (this.flashTime <= 0) { this.flash.visible = false; this.tracer.visible = false; }
  }
}
