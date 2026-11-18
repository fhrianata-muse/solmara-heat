// audio.js — every sound in Solmara Heat is synthesised with WebAudio; the
// game ships no audio files. A sawtooth engine whose pitch follows speed, a
// two-tone siren that exists only while Mara is wanted, a sunny triangle-wave
// radio loop (Solmara Sun FM), and one-shot blips for shots, pickups, payouts
// and failures.

const RADIO_SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
const RADIO_MELODY = [0, 2, 4, 7, 4, 2, 5, 4, 0, 2, 4, 2, 1, 2, 0, -1]; // -1 = a rest

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.live = false;
    this.radioOn = true;
    this.radioTimer = 0;
    this.noteIndex = 0;
    this.sirenPhase = 0;
  }

  /** Build the graph. Must be called from a user gesture (Start button). */
  start() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      const voice = (type) => {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        return { osc, gain };
      };
      this.engine = voice('sawtooth');
      this.siren = voice('square');
      this.live = true;
    } catch {
      this.live = false;
    }
  }

  /** One enveloped blip: the atom every sound effect is built from. */
  blip(freq, dur, type = 'sine', vol = 0.5, delay = 0) {
    if (!this.live) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  shot() { this.blip(160, 0.12, 'square', 0.8); this.blip(70, 0.16, 'sawtooth', 0.6); }
  pickup() { this.blip(660, 0.1, 'sine', 0.5); this.blip(990, 0.14, 'sine', 0.5, 0.09); }
  paid() { [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.16, 'triangle', 0.55, i * 0.09)); }
  fail() { this.blip(220, 0.3, 'sawtooth', 0.5); this.blip(165, 0.4, 'sawtooth', 0.5, 0.22); }

  toggleRadio() {
    this.radioOn = !this.radioOn;
    return this.radioOn;
  }

  /** Per-frame mix: engine from speed, siren from stars, radio on a timer. */
  update(dt, speed, stars) {
    if (!this.live) return;
    const pace = Math.abs(speed || 0);
    this.engine.osc.frequency.value = 55 + pace * 4.2;
    this.engine.gain.gain.value = pace > 0.4 ? 0.25 : 0.07;
    if (stars > 0) {
      this.sirenPhase += dt * 2.4;
      this.siren.osc.frequency.value = Math.sin(this.sirenPhase * Math.PI) > 0 ? 720 : 540;
      this.siren.gain.gain.value = 0.12;
    } else {
      this.siren.gain.gain.value = 0;
    }
    if (this.radioOn) {
      this.radioTimer -= dt;
      if (this.radioTimer <= 0) {
        const step = RADIO_MELODY[this.noteIndex % RADIO_MELODY.length];
        if (step >= 0) this.blip(RADIO_SCALE[step], 0.22, 'triangle', 0.2);
        this.noteIndex += 1;
        this.radioTimer = 0.24;
      }
    }
  }
}
