// effects.js — event-driven feedback only (game-feel's first rule: an effect
// answers an event, plays, and decays back to rest). One pooled particle
// system carries sparks, dust and celebration bursts; one pooled strip of
// rubber quads carries skid marks. Effects read the simulation's events —
// they never write back into it.

const PARTICLE_CAP = 260;
const SKID_CAP = 110;

export class Effects {
  constructor(scene) {
    // Particle pool: fixed buffers, round-robin reuse, dead particles parked
    // far underground so the Points draw never branches.
    this.positions = new Float32Array(PARTICLE_CAP * 3);
    this.colours = new Float32Array(PARTICLE_CAP * 3);
    this.velocities = new Float32Array(PARTICLE_CAP * 3);
    this.lifetimes = new Float32Array(PARTICLE_CAP);
    this.gravities = new Float32Array(PARTICLE_CAP);
    for (let i = 0; i < PARTICLE_CAP; i++) this.positions[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colours, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.17, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;

    // Skid pool: identical rubber quads, recycled oldest-first.
    const skidGeo = new THREE.PlaneGeometry(0.3, 1.15);
    skidGeo.rotateX(-Math.PI / 2);
    this.skidMaterial = new THREE.MeshBasicMaterial({
      color: 0x14161a, transparent: true, opacity: 0.38, depthWrite: false,
    });
    this.skidPool = [];
    for (let i = 0; i < SKID_CAP; i++) {
      const quad = new THREE.Mesh(skidGeo, this.skidMaterial);
      quad.visible = false;
      quad.position.y = 0.045;
      scene.add(quad);
      this.skidPool.push(quad);
    }
    this.skidCursor = 0;
  }

  /** Emit `count` particles in an upward-biased cone, colours cycling. */
  burst(x, y, z, { count = 10, colors = [0xffc873], speed = 4, up = 2.5, gravity = 6, life = 0.5 } = {}) {
    const tint = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % PARTICLE_CAP;
      const angle = Math.random() * Math.PI * 2;
      const reach = Math.random() * speed;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.velocities[i * 3] = Math.cos(angle) * reach;
      this.velocities[i * 3 + 1] = Math.random() * up;
      this.velocities[i * 3 + 2] = Math.sin(angle) * reach;
      tint.set(colors[n % colors.length]);
      this.colours[i * 3] = tint.r;
      this.colours[i * 3 + 1] = tint.g;
      this.colours[i * 3 + 2] = tint.b;
      this.lifetimes[i] = life * (0.6 + Math.random() * 0.7);
      this.gravities[i] = gravity;
    }
  }

  /** Gunshot impact: a fast orange-white spark fan. */
  sparks(x, y, z) {
    this.burst(x, y, z, { count: 9, colors: [0xffe98a, 0xff9a3c, 0xffffff], speed: 3.4, up: 3, gravity: 7, life: 0.38 });
  }

  /** Collision dust: a slow tan puff that hangs, then settles. */
  dust(x, y, z) {
    this.burst(x, y, z, { count: 12, colors: [0xd8c9a3, 0xbfb091, 0xe8dcc0], speed: 1.7, up: 1.5, gravity: 1.2, life: 0.7 });
  }

  /** Money moment: a tall gold fountain for pickups and payouts. */
  celebrate(x, y, z) {
    this.burst(x, y, z, { count: 26, colors: [0xffd83d, 0xffe970, 0xfff6b8, 0xe8b54a], speed: 2.6, up: 5.2, gravity: 5.5, life: 0.85 });
  }

  /** Lay one rubber segment under a drifting car. */
  skid(x, z, heading) {
    const quad = this.skidPool[this.skidCursor];
    this.skidCursor = (this.skidCursor + 1) % SKID_CAP;
    quad.position.x = x;
    quad.position.z = z;
    quad.rotation.y = heading;
    quad.visible = true;
  }

  update(dt) {
    for (let i = 0; i < PARTICLE_CAP; i++) {
      if (this.lifetimes[i] <= 0) continue;
      this.lifetimes[i] -= dt;
      if (this.lifetimes[i] <= 0) {
        this.positions[i * 3 + 1] = -999;
        continue;
      }
      this.velocities[i * 3 + 1] -= this.gravities[i] * dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < 0.03) {
        this.positions[i * 3 + 1] = 0.03;
        this.velocities[i * 3 + 1] = 0;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
