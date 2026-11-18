// hud.js — everything the player reads while driving: the wanted-star and
// cash pills (they pulse when they change — a star arriving should FEEL
// different from a star sitting there), the mission banner with its draining
// delivery bar, toasts, a speed readout with its own bar, and the circular
// minimap: roads, beach, the mission target, police, traffic, Mara's arrow.

import { CITY_HALF, ROAD_SPACING, BEACH_Z } from './city.js';

const MAP_SIZE = 168;
const MAP_RANGE = 130; // metres of world across the minimap

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.cashEl = document.getElementById('cash');
    this.starsEl = document.getElementById('stars');
    this.bannerEl = document.getElementById('jobBanner');
    this.barEl = document.getElementById('jobBar');
    this.barWrap = document.getElementById('jobBarWrap');
    this.toastEl = document.getElementById('toast');
    this.speedEl = document.getElementById('speedNum');
    this.speedBarEl = document.getElementById('speedBar');
    this.mapCtx = document.getElementById('minimap').getContext('2d');
    this.toastTimer = 0;
    this.shownStars = -1;
    this.shownCash = -1;
    this.clock = 0;
    // The banner is a title node + a <small> sub-line, rebuilt once here so
    // update() only ever writes text, never markup.
    this.bannerTitle = document.createTextNode('');
    this.bannerSub = document.createElement('small');
    this.bannerEl.prepend(this.bannerTitle, this.bannerSub);
  }

  show() { this.root.classList.remove('hidden'); }

  toast(text, seconds = 2.6) {
    this.toastEl.textContent = text;
    this.toastTimer = seconds;
    this.toastEl.style.opacity = '1';
  }

  /** Restart a CSS animation on an element (star pulse, cash bump). */
  flashClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // reflow: without it the animation will not replay
    el.classList.add(cls);
  }

  update(dt, state) {
    this.clock += dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.style.opacity = '0';
    }
    if (state.cash !== this.shownCash) {
      if (this.shownCash >= 0 && state.cash > this.shownCash) this.flashClass(this.cashEl, 'bump');
      this.cashEl.textContent = '$' + state.cash.toLocaleString('en-US');
      this.shownCash = state.cash;
    }
    if (state.stars !== this.shownStars) {
      if (this.shownStars >= 0 && state.stars > this.shownStars) this.flashClass(this.starsEl, 'pulse');
      this.shownStars = state.stars;
      this.starsEl.innerHTML = '★'.repeat(state.stars)
        + '<span class="off">' + '★'.repeat(5 - state.stars) + '</span>';
    }
    const [title, sub] = state.banner;
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    // The delivery countdown is a draining bar, not only a number.
    if (state.jobFraction == null) {
      this.barWrap.style.display = 'none';
    } else {
      this.barWrap.style.display = 'block';
      this.barEl.style.width = Math.max(0, Math.min(1, state.jobFraction)) * 100 + '%';
    }
    const kmh = state.inCar ? Math.round(Math.abs(state.speed) * 3.2) : 0;
    this.speedEl.textContent = state.inCar ? String(kmh) : '';
    this.speedBarEl.style.width = Math.min(100, (kmh / 130) * 100) + '%';
    this.drawMinimap(state);
  }

  drawMinimap(state) {
    const ctx = this.mapCtx, S = MAP_SIZE;
    const px = state.player.x, pz = state.player.z;
    const project = (x, z) => [S / 2 + (x - px) * (S / 2 / MAP_RANGE), S / 2 + (z - pz) * (S / 2 / MAP_RANGE)];
    ctx.fillStyle = '#7fae56';
    ctx.fillRect(0, 0, S, S);
    // Road grid first, then the beach band across its south edge.
    ctx.strokeStyle = 'rgba(245,242,232,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let v = -CITY_HALF + 22; v <= CITY_HALF; v += ROAD_SPACING) {
      const [vx1, vz1] = project(v, -CITY_HALF);
      const [vx2, vz2] = project(v, CITY_HALF);
      ctx.moveTo(vx1, vz1); ctx.lineTo(vx2, vz2);
      const [hx1, hz1] = project(-CITY_HALF, v);
      const [hx2, hz2] = project(CITY_HALF, v);
      ctx.moveTo(hx1, hz1); ctx.lineTo(hx2, hz2);
    }
    ctx.stroke();
    const [, beachY] = project(0, BEACH_Z);
    ctx.fillStyle = '#ead9a0';
    ctx.fillRect(0, beachY, S, S - beachY);
    ctx.fillStyle = '#1f8aad';
    ctx.fillRect(0, beachY + 22, S, S - beachY);
    // Mission target: a gold disc with a soft breathing halo.
    if (state.target) {
      const [tx, ty] = project(state.target[0], state.target[1]);
      const cx = Math.max(8, Math.min(S - 8, tx)), cy = Math.max(8, Math.min(S - 8, ty));
      ctx.fillStyle = 'rgba(255,216,61,0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, 9 + Math.sin(this.clock * 4) * 1.6, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffd83d';
      ctx.strokeStyle = '#7a5200';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 7);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#2266ff';
    for (const cop of state.police) {
      const [cx, cy] = project(cop.x, cop.z);
      ctx.beginPath();
      ctx.arc(cx, cy, 3.4, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const car of state.traffic) {
      const [cx, cy] = project(car.x, car.z);
      ctx.fillRect(cx - 1.6, cy - 1.6, 3.2, 3.2);
    }
    // Mara's arrow, rotated to her heading, always centre-frame.
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(state.heading);
    ctx.fillStyle = '#e2483d';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.4, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
