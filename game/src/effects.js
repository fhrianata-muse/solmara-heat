// effects.js — event-driven feedback (game-feel): one particle pool for
// sparks and dust, one skid-mark pool for handbrake drifts. Effects never
// touch the simulation: they read events and draw, then decay to rest.

const MAX_PARTICLES = 260;
const MAX_SKIDS = 110;

export class Effects {
  constructor(scene) {
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.vel = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.grav = new Float32Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) this.pos[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.17, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;

    this.skidGeo = new THREE.PlaneGeometry(0.3, 1.15);
    this.skidGeo.rotateX(-Math.PI / 2);
    this.skidMat = new THREE.MeshBasicMaterial({ color: 0x14161a, transparent: true, opacity: 0.38, depthWrite: false });
    this.skids = [];
    for (let i = 0; i < MAX_SKIDS; i++) {
      const m = new THREE.Mesh(this.skidGeo, this.skidMat);
      m.visible = false; m.position.y = 0.045; scene.add(m); this.skids.push(m);
    }
    this.skidCursor = 0;
  }

  /** Spawn `count` particles: colors cycle, velocity cone biased upward. */
  burst(x, y, z, { count = 10, colors = [0xffc873], speed = 4, up = 2.5, gravity = 6, life = 0.5 }) {
    const c = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const a = Math.random() * Math.PI * 2, r = Math.random() * speed;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * r;
      this.vel[i * 3 + 1] = Math.random() * up;
      this.vel[i * 3 + 2] = Math.sin(a) * r;
      c.set(colors[n % colors.length]);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.grav[i] = gravity;
    }
  }

  /** Gunshot hit: a fast orange-white spark fan (game-feel medium tier). */
  sparks(x, y, z) { this.burst(x, y, z, { count: 9, colors: [0xffe98a, 0xff9a3c, 0xffffff], speed: 3.4, up: 3, gravity: 7, life: 0.38 }); }

  /** Impact dust: slow tan puff that hangs and settles. */
  dust(x, y, z) { this.burst(x, y, z, { count: 12, colors: [0xd8c9a3, 0xbfb091, 0xe8dcc0], speed: 1.7, up: 1.5, gravity: 1.2, life: 0.7 }); }

  /** Lay one rubber segment under a drifting car. */
  skid(x, z, heading) {
    const m = this.skids[this.skidCursor];
    this.skidCursor = (this.skidCursor + 1) % MAX_SKIDS;
    m.position.x = x; m.position.z = z;
    m.rotation.y = heading;
    m.visible = true;
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.03) { this.pos[i * 3 + 1] = 0.03; this.vel[i * 3 + 1] = 0; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
