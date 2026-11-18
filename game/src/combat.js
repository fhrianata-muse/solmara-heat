// combat.js — Mara's little equaliser: a hitscan sidearm usable on foot or
// from a car. A shot is an event with a shape: a muzzle flash that throws
// real light, a tracer line to the impact point, a spark burst where it
// lands, and noise — pedestrians flee from lastShotAt and the wanted meter
// hears every round.

export class Combat {
  constructor(scene, effects = null) {
    this.effects = effects;
    this.cooldown = 0;
    this.flashTime = 0;
    this.lastShotAt = null; // {x, z} of the latest shot — the crowd flees it

    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe98a }));
    this.flash.visible = false;
    scene.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffc873, 0, 13, 2);
    scene.add(this.flashLight);
    this.tracer = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1),
      new THREE.MeshBasicMaterial({ color: 0xffd83d }));
    this.tracer.visible = false;
    scene.add(this.tracer);
  }

  /**
   * Fire from `origin` along the unit horizontal `dir`. The nearest person
   * (within 0.9 m of the ray) or car (within 2.1 m) takes the hit.
   * Returns 'person' | 'car' | null.
   */
  fire(origin, dir, pedestrians, cars, wanted, audio) {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.22;
    this.flashTime = 0.06;
    this.lastShotAt = { x: origin.x, z: origin.z };
    wanted.crime(18);
    if (audio) audio.shot();

    const muzzle = { x: origin.x + dir.x * 1.1, z: origin.z + dir.z * 1.1 };
    this.flash.position.set(muzzle.x, 1.35, muzzle.z);
    this.flash.visible = true;
    this.flashLight.position.set(muzzle.x, 1.4, muzzle.z);
    this.flashLight.intensity = 2.6;

    // Ray-march by projection: t along the ray, side distance off it.
    let bestT = 42, victim = null, victimKind = null;
    const testTarget = (tx, tz, sideLimit, kind, target) => {
      const t = (tx - origin.x) * dir.x + (tz - origin.z) * dir.z;
      if (t < 0 || t > bestT) return;
      const side = Math.abs((tx - origin.x) * dir.z - (tz - origin.z) * dir.x);
      if (side < sideLimit) { bestT = t; victim = target; victimKind = kind; }
    };
    for (const p of pedestrians.people) if (!p.down) testTarget(p.x, p.z, 0.9, 'person', p);
    for (const car of cars) if (!car.dead) testTarget(car.x, car.z, 2.1, 'car', car);

    const impact = { x: origin.x + dir.x * bestT, z: origin.z + dir.z * bestT };
    this.tracer.visible = true;
    this.tracer.scale.z = bestT;
    this.tracer.position.set((muzzle.x + impact.x) / 2, 1.3, (muzzle.z + impact.z) / 2);
    this.tracer.rotation.y = Math.atan2(dir.x, dir.z);

    if (victimKind === 'person') {
      victim.health -= 2;
      if (victim.health <= 0) {
        pedestrians.knockDown(victim);
        wanted.crime(22);
      }
    }
    if (victimKind === 'car') {
      victim.health -= 14;
      if (victim.kind === 'police') wanted.crime(15);
    }
    if (victimKind && this.effects) this.effects.sparks(impact.x, 1.15, impact.z);
    return victimKind;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flashTime -= dt;
    if (this.flashTime <= 0) {
      this.flash.visible = false;
      this.tracer.visible = false;
      this.flashLight.intensity = 0;
    }
  }
}
