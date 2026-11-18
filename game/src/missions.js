// missions.js — Mara Voss's 7-job story arc in Solmara Bay. Each job: drive to
// the glowing pickup, then deliver to the second marker before the timer ends.
// Payouts rise, later jobs draw police heat, and finishing all 7 ends the story.

export const JOBS = [
  { name: 'Job 1 · Beach Club Run', from: [-154, 132], to: [66, 154], pay: 350, time: 75, heat: 0,
    text: 'Pick up the sealed cooler at Palms Row and drop it at the Coral Beach Club.' },
  { name: 'Job 2 · Marina Parts', from: [110, 146], to: [-88, 66], pay: 520, time: 85, heat: 15,
    text: 'Boat parts from the marina pier to the Gull Street workshop. No questions.' },
  { name: 'Job 3 · Rooftop Broker', from: [-44, -42], to: [132, -86], pay: 780, time: 90, heat: 25,
    text: 'A briefcase changes hands downtown. The broker pays extra if you are quick.' },
  { name: 'Job 4 · Hotel Valet Swap', from: [88, 20], to: [-132, -108], pay: 1050, time: 95, heat: 35,
    text: 'Swap the valet car at the Sunspire Hotel and park the twin across town.' },
  { name: 'Job 5 · Night Market Dash', from: [-154, -152], to: [154, 110], pay: 1400, time: 105, heat: 45,
    text: 'Cross the whole bay with the market money. Every patrol will be watching.' },
  { name: 'Job 6 · The Guild Ledger', from: [22, -176], to: [-176, 44], pay: 1900, time: 110, heat: 55,
    text: 'Steal back the courier guild ledger — proof they framed your brother.' },
  { name: 'Job 7 · Getaway at Dawn', from: [176, -152], to: [104, 158], pay: 2600, time: 120, heat: 70,
    text: 'Last run: the ledger buyer waits at the marina. Shake the PD and finish the story.' },
];

export class Missions {
  constructor(scene) {
    this.index = 0;            // next job to offer
    this.phase = 'offer';      // offer -> pickup -> deliver -> offer ... -> done
    this.timer = 0;
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 42, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd83d, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    this.beacon.position.y = 21; scene.add(this.beacon);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd83d, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.15; scene.add(this.ring);
    this.spin = 0;
  }
  get job() { return JOBS[this.index] || null; }
  get target() {
    if (!this.job) return null;
    return this.phase === 'offer' || this.phase === 'pickup' ? this.job.from : this.job.to;
  }
  /** Advance the story when the player reaches the marker. Returns an event string or null. */
  update(dt, playerPos, wanted) {
    if (!this.job) { this.beacon.visible = this.ring.visible = false; return null; }
    const [tx, tz] = this.target;
    this.beacon.position.x = tx; this.beacon.position.z = tz;
    this.ring.position.x = tx; this.ring.position.z = tz;
    this.spin += dt; this.ring.rotation.z = this.spin * 1.4;
    this.beacon.material.opacity = 0.32 + Math.sin(this.spin * 3) * 0.12;
    if (this.phase === 'deliver') {
      this.timer -= dt;
      if (this.timer <= 0) { this.phase = 'offer'; return 'failed'; }
    }
    const dist = Math.hypot(playerPos.x - tx, playerPos.z - tz);
    if (dist > 5.2) return null;
    if (this.phase === 'offer') { this.phase = 'pickup'; return 'brief'; }
    if (this.phase === 'pickup') {
      this.phase = 'deliver'; this.timer = this.job.time;
      if (this.job.heat > 0) wanted.crime(this.job.heat);
      return 'pickup';
    }
    if (this.phase === 'deliver') {
      const pay = this.job.pay + Math.round(this.timer * 4);
      this.index += 1; this.phase = this.job ? 'offer' : 'done';
      if (!this.job) this.phase = 'done';
      return 'paid:' + pay;
    }
    return null;
  }
  banner() {
    if (this.phase === 'done' || !this.job) return ['STORY COMPLETE — Mara cleared her brother\'s name!', 'Free-roam Solmara Bay, or reload your save to run it again'];
    const j = this.job;
    if (this.phase === 'offer') return [j.name, 'Reach the gold marker to take the job'];
    if (this.phase === 'pickup') return [j.name, j.text];
    return [j.name + ' — DELIVER!', `${j.text} · ${Math.max(0, Math.ceil(this.timer))}s left · $${j.pay}+ on delivery`];
  }
}
