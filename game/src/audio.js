// audio.js — all sound is synthesised with WebAudio, no files: an engine hum
// whose pitch follows speed, a two-tone police siren, a sunny radio loop
// (a few detuned triangle notes), and one-shot effects for shots and pickups.
// (Rebuild v2 left the synth untouched — the rebuild was visual only.)

export class GameAudio {
  constructor() {
    this.ctx = null; this.enabled = false; this.radioOn = true;
    this.radioTimer = 0; this.noteIndex = 0; this.sirenPhase = 0;
  }
  /** Must be called from a user gesture (the Start button). */
  start() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'square';
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.enabled = true;
    } catch { this.enabled = false; }
  }
  blip(freq, dur, type = 'sine', vol = 0.5, when = 0) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  shot() { this.blip(160, 0.12, 'square', 0.8); this.blip(70, 0.16, 'sawtooth', 0.6); }
  pickup() { this.blip(660, 0.1, 'sine', 0.5); this.blip(990, 0.14, 'sine', 0.5, 0.09); }
  paid() { [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.16, 'triangle', 0.55, i * 0.09)); }
  fail() { this.blip(220, 0.3, 'sawtooth', 0.5); this.blip(165, 0.4, 'sawtooth', 0.5, 0.22); }
  toggleRadio() { this.radioOn = !this.radioOn; return this.radioOn; }
  /** Per-frame: engine pitch from speed, siren when wanted, radio melody. */
  update(dt, speed, stars) {
    if (!this.enabled) return;
    const s = Math.abs(speed || 0);
    this.engineOsc.frequency.value = 55 + s * 4.2;
    this.engineGain.gain.value = s > 0.4 ? 0.25 : 0.07;
    if (stars > 0) {
      this.sirenPhase += dt * 2.4;
      this.sirenOsc.frequency.value = Math.sin(this.sirenPhase * Math.PI) > 0 ? 720 : 540;
      this.sirenGain.gain.value = 0.12;
    } else this.sirenGain.gain.value = 0;
    if (this.radioOn) {
      this.radioTimer -= dt;
      if (this.radioTimer <= 0) {
        const scale = [262, 294, 330, 392, 440, 523, 587, 659];
        const melody = [0, 2, 4, 7, 4, 2, 5, 4, 0, 2, 4, 2, 1, 2, 0, -1];
        const idx = melody[this.noteIndex % melody.length];
        if (idx >= 0) this.blip(scale[idx], 0.22, 'triangle', 0.20);
        this.noteIndex += 1; this.radioTimer = 0.24;
      }
    }
  }
}
