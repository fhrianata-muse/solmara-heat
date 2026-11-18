// missions.js — Mara Voss's seven-job story arc across Solmara Bay.
//
// Each job is two legs: reach the gold marker and take the cargo (the
// "pickup"), then deliver it to the second marker against a draining timer.
// Payouts climb, later jobs arrive with police heat attached, and the
// seventh delivery closes the story. The marker is an authored place, not
// just a light: a gradient beacon beam, a breathing ground ring, a pulsing
// pool of gold light on the asphalt, and the strapped courier crate itself
// waiting to be collected.

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

import { canvasTexture, mergeParts, partMaterial, glowDiscTexture } from './materials.js';

// Beam falloff, painted once: bright at the ground, gone at the top
// (an alphaMap reads its green channel).
const BEAM_FADE = canvasTexture(4, 128, (ctx, w, h) => {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(0.75, '#5a5a5a');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}, 149);

const GOLD = 0xffd83d;

export class Missions {
  constructor(scene) {
    this.index = 0;         // next job on the board
    this.phase = 'offer';   // offer -> pickup -> deliver -> offer … -> done
    this.timer = 0;
    this.spin = 0;
    this.celebrate = 0;     // 1 just after a pickup/delivery, decays to 0

    const beamMaterial = (color, opacity) => new THREE.MeshBasicMaterial({
      color, alphaMap: BEAM_FADE, transparent: true, opacity,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 42, 14, 1, true), beamMaterial(GOLD, 0.5));
    this.beacon.position.y = 21;
    scene.add(this.beacon);
    this.beaconCore = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 42, 8, 1, true), beamMaterial(0xffe970, 0.7));
    this.beaconCore.position.y = 21;
    scene.add(this.beaconCore);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.15;
    scene.add(this.ring);

    // The pool of light the beacon stands in: additive, gold, breathing —
    // and it flares hard for a moment whenever cargo changes hands.
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: glowDiscTexture(), color: GOLD, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.06;
    scene.add(this.glow);

    // The cargo: a strapped courier crate, so the goal is a thing in the
    // world and not only a column of light.
    this.prop = new THREE.Group();
    const crate = new THREE.Mesh(mergeParts([
      { geo: new THREE.BoxGeometry(0.95, 0.68, 0.95), color: 0x8a6642, y: 0.34 },
      { geo: new THREE.BoxGeometry(1.05, 0.16, 1.05), color: 0xe2483d, y: 0.76 },
      { geo: new THREE.BoxGeometry(1.0, 0.12, 0.2), color: 0x3a3e42, y: 0.36 },
      { geo: new THREE.BoxGeometry(0.2, 0.12, 1.0), color: 0x3a3e42, y: 0.36 },
    ]), partMaterial);
    crate.castShadow = true;
    this.prop.add(crate);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 1.0),
      new THREE.MeshBasicMaterial({ color: GOLD }));
    band.position.y = 0.55;
    this.prop.add(band);
    scene.add(this.prop);
  }

  get job() { return JOBS[this.index] || null; }

  get target() {
    if (!this.job) return null;
    return this.phase === 'deliver' ? this.job.to : this.job.from;
  }

  /** Advance the story if Mara is on the marker. Returns an event or null. */
  update(dt, playerPos, wanted) {
    if (!this.job) {
      this.beacon.visible = this.ring.visible = this.beaconCore.visible = this.prop.visible = this.glow.visible = false;
      return null;
    }
    const [tx, tz] = this.target;
    this.spin += dt;
    this.celebrate = Math.max(0, this.celebrate - dt * 1.4);
    const pulse = Math.sin(this.spin * 3);
    for (const marker of [this.beacon, this.beaconCore]) {
      marker.position.x = tx;
      marker.position.z = tz;
    }
    this.ring.position.set(tx, 0.15, tz);
    this.ring.rotation.z = this.spin * 1.4;
    // The ring breathes gently — and swells when cargo just changed hands.
    this.ring.scale.setScalar(1 + pulse * 0.07 + this.celebrate * 0.35);
    this.beacon.material.opacity = 0.4 + pulse * 0.1 + this.celebrate * 0.3;
    this.glow.position.set(tx, 0.06, tz);
    this.glow.material.opacity = 0.32 + pulse * 0.08 + this.celebrate * 0.45;
    const glowScale = 1 + pulse * 0.05 + this.celebrate * 0.5;
    this.glow.scale.set(glowScale, glowScale, 1);
    this.prop.position.set(tx, Math.sin(this.spin * 2) * 0.05, tz);
    this.prop.rotation.y = this.spin * 0.6;

    if (this.phase === 'deliver') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.phase = 'offer';
        return 'failed';
      }
    }
    const dist = Math.hypot(playerPos.x - tx, playerPos.z - tz);
    if (dist > 5.2) return null;
    if (this.phase === 'offer') {
      this.phase = 'pickup';
      return 'brief';
    }
    if (this.phase === 'pickup') {
      this.phase = 'deliver';
      this.timer = this.job.time;
      this.celebrate = 1;
      if (this.job.heat > 0) wanted.crime(this.job.heat);
      return 'pickup';
    }
    if (this.phase === 'deliver') {
      const pay = this.job.pay + Math.round(this.timer * 4);
      this.index += 1;
      this.celebrate = 1;
      this.phase = this.job ? 'offer' : 'done';
      return 'paid:' + pay;
    }
    return null;
  }

  banner() {
    if (this.phase === 'done' || !this.job) {
      return ['STORY COMPLETE — Mara cleared her brother\'s name!',
        'Free-roam Solmara Bay, or reload your save to run it again'];
    }
    const j = this.job;
    if (this.phase === 'offer') return [j.name, 'Reach the gold marker to take the job'];
    if (this.phase === 'pickup') return [j.name, j.text];
    return [j.name + ' — DELIVER!',
      `${j.text} · ${Math.max(0, Math.ceil(this.timer))}s left · $${j.pay}+ on delivery`];
  }
}
