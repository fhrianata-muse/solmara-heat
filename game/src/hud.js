// hud.js — the on-screen HUD: cash, wanted stars, job banner, toasts, speed,
// and the circular minimap (roads, beach, mission marker, police, player arrow).

import { CITY_HALF, ROAD_SPACING, BEACH_Z } from './city.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.cashEl = document.getElementById('cash');
    this.starsEl = document.getElementById('stars');
    this.bannerEl = document.getElementById('jobBanner');
    this.toastEl = document.getElementById('toast');
    this.speedEl = document.getElementById('speed');
    this.map = document.getElementById('minimap').getContext('2d');
    this.toastTimer = 0; this.lastStars = -1; this.lastCash = -1;
  }
  show() { this.root.classList.remove('hidden'); }
  toast(text, seconds = 2.6) { this.toastEl.textContent = text; this.toastTimer = seconds; }
  update(dt, state) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.toastEl.textContent = ''; }
    if (state.cash !== this.lastCash) { this.cashEl.textContent = '$' + state.cash.toLocaleString('en-US'); this.lastCash = state.cash; }
    if (state.stars !== this.lastStars) {
      this.lastStars = state.stars;
      this.starsEl.innerHTML = '★'.repeat(state.stars) + '<span class="off">' + '★'.repeat(5 - state.stars) + '</span>';
    }
    const [title, sub] = state.banner;
    this.bannerEl.innerHTML = '';
    this.bannerEl.append(document.createTextNode(title));
    const small = document.createElement('small'); small.textContent = sub; this.bannerEl.append(small);
    this.speedEl.textContent = state.inCar ? Math.round(Math.abs(state.speed) * 3.2) + ' km/h' : '';
    this.drawMinimap(state);
  }
  drawMinimap(state) {
    const ctx = this.map, S = 168, range = 130;
    const px = state.player.x, pz = state.player.z;
    const toMap = (x, z) => [S / 2 + (x - px) * (S / 2 / range), S / 2 + (z - pz) * (S / 2 / range)];
    ctx.fillStyle = '#79b657'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5;
    for (let v = -CITY_HALF + 22; v <= CITY_HALF; v += ROAD_SPACING) {
      let [x1, z1] = toMap(v, -CITY_HALF); let [x2, z2] = toMap(v, CITY_HALF);
      ctx.beginPath(); ctx.moveTo(x1, z1); ctx.lineTo(x2, z2); ctx.stroke();
      [x1, z1] = toMap(-CITY_HALF, v); [x2, z2] = toMap(CITY_HALF, v);
      ctx.beginPath(); ctx.moveTo(x1, z1); ctx.lineTo(x2, z2); ctx.stroke();
    }
    const [, bz] = toMap(0, BEACH_Z);
    ctx.fillStyle = '#f6dd9e'; ctx.fillRect(0, bz, S, S - bz);
    ctx.fillStyle = '#1f9ec4'; ctx.fillRect(0, bz + 22, S, S - bz);
    if (state.target) {
      const [tx, ty] = toMap(state.target[0], state.target[1]);
      ctx.fillStyle = '#ffd83d'; ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Math.max(8, Math.min(S - 8, tx)), Math.max(8, Math.min(S - 8, ty)), 6, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#2266ff';
    for (const cop of state.police) { const [cx, cy] = toMap(cop.x, cop.z); ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffffff';
    for (const car of state.traffic) { const [cx, cy] = toMap(car.x, car.z); ctx.fillRect(cx - 1.6, cy - 1.6, 3.2, 3.2); }
    // Player arrow, rotated to heading.
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(state.heading);
    ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.4, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.4, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
