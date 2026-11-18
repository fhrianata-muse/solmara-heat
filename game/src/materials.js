// materials.js — the one shared material library for Solmara Bay. Every mesh
// in the game takes its surface from here: car paint, glass, rubber, chrome,
// trim, foliage. One material-role set, reused — never per-object improvisation
// (LOOK.md). Seeded canvas textures for the city surfaces live here too, so a
// texture is generated once and shared by every mesh that wears it.

/** Deterministic RNG for texture painting: same seed, same pixels, every load. */
export function texRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** A canvas texture painted by `draw(ctx, w, h)`; colour maps are sRGB. */
export function canvasTexture(w, h, draw, seed = 7) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h, texRandom(seed));
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Scale a geometry's UVs so a texture tiles once per `world` metres. */
export function tileUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

/**
 * Merge transformed, coloured parts into one BufferGeometry with vertex
 * colours — the kit-bash workhorse for trim, car detail and props, so a whole
 * family's small parts cost a single draw call. Each part: { geo, color,
 * x, y, z, rx, ry, rz, sx, sy, sz } (all but geo/color optional).
 */
export function mergeParts(parts) {
  const pos = [], nor = [], uvA = [], col = [];
  const c = new THREE.Color();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    _e.set(p.rx || 0, p.ry || 0, p.rz || 0);
    _q.setFromEuler(_e);
    _m4.compose(new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0), _q,
      new THREE.Vector3(p.sx || 1, p.sy || 1, p.sz || 1));
    g.applyMatrix4(_m4);
    c.set(p.color);
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
    for (let i = 0; i < pa.count; i++) {
      pos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      nor.push(na.getX(i), na.getY(i), na.getZ(i));
      uvA.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
      col.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

/** One material for every vertex-coloured merged part (trim, detail, props). */
export const partMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide,
});

function speckle(ctx, w, h, r, n, colors, aMax, sMax = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.globalAlpha = 0.05 + r() * aMax;
    ctx.fillRect(r() * w, r() * h, 1 + r() * sMax, 1 + r() * sMax);
  }
  ctx.globalAlpha = 1;
}

/** Asphalt patch (one 12 m tile): dark base, aggregate speckle, wear bands. */
export function asphaltTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    // Painted bright: an sRGB colour map decodes darker than the same hex
    // used as a material colour, so the patch is lifted a tone to land on
    // LOOK.md's asphalt #3C4147 in the render.
    ctx.fillStyle = '#565d66'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 2400, ['#454b53', '#646b74', '#767e88'], 0.16);
    ctx.globalAlpha = 0.1; ctx.fillStyle = '#3a3f46';
    for (let i = 0; i < 5; i++) ctx.fillRect(0, r() * h, w, 6 + r() * 16);
    ctx.globalAlpha = 1;
  }, 11);
}

/** Sidewalk slabs (one 4 m tile = 2x2 slabs) with grout lines and speckle. */
export function sidewalkTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#c9c2b4'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 1500, ['#b7b09e', '#d8d2c2', '#a8a08c'], 0.14);
    ctx.strokeStyle = 'rgba(90,84,70,0.55)'; ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h); ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }, 23);
}

/** Sand: warm base with shell-fleck speckle. */
export function sandTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#ead9a0'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 1800, ['#dcc384', '#f6e7ba', '#cbb26e'], 0.2);
  }, 37);
}

/** Sea surface: deep teal with sun sparkle streaks (scrolled slowly in play). */
export function waterTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#1f8aad'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      ctx.strokeStyle = r() < 0.5 ? '#5fc3dd' : '#17708e';
      ctx.globalAlpha = 0.12 + r() * 0.25; ctx.lineWidth = 1 + r() * 1.6;
      const y = r() * h, x = r() * w, len = 8 + r() * 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (r() - 0.5) * 3); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, 41);
}

/**
 * Deco facade (one tile = 4 windows x 3 floors): plaster bright enough to
 * take the building's tint, framed glass with a sky shine, a ledge shadow
 * under every window and a trim line per floor. Repeat per building size.
 */
export function facadeTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#e7dcc2'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 700, ['#d8cbab', '#f4ecd8'], 0.1);
    const cols = 4, rows = 3, cw = w / cols, ch = h / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cw + 13, y = row * ch + 15, ww = cw - 26, wh = ch - 34;
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const grad = ctx.createLinearGradient(x, y, x + ww, y + wh);
        grad.addColorStop(0, '#8fc3d9'); grad.addColorStop(0.45, '#33566b'); grad.addColorStop(1, '#274b5e');
        ctx.fillStyle = grad; ctx.fillRect(x, y, ww, wh);
        ctx.strokeStyle = 'rgba(255,250,240,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + ww / 2, y); ctx.lineTo(x + ww / 2, y + wh);
        ctx.moveTo(x, y + wh / 2); ctx.lineTo(x + ww, y + wh / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(60,50,35,0.28)'; ctx.fillRect(x - 3, y + wh + 5, ww + 6, 5); // ledge shadow
      }
      ctx.fillStyle = 'rgba(120,100,70,0.35)'; ctx.fillRect(0, (row + 1) * ch - 2, w, 2); // floor trim line
    }
  }, 53);
}

/** Pier planks: horizontal boards with gaps and grain. */
export function woodTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#8a6642'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, r, 1200, ['#77572f', '#9c774e'], 0.18, 5);
    ctx.fillStyle = 'rgba(40,26,12,0.6)';
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 3);
  }, 67);
}

/** Painted sign board: deco border + bold centred name. */
export function signTexture(text, bg, fg) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg; ctx.font = '800 54px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  }, 71);
}

/** Vertical sky gradient (zenith -> horizon -> warm sea haze) for the dome. */
export function skyTexture() {
  const t = canvasTexture(32, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2e7cd6'); grad.addColorStop(0.55, '#7ec2e8');
    grad.addColorStop(0.78, '#bfe3f2'); grad.addColorStop(1, '#f2e3c6');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }, 83);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Car paint by colour, cached: glossy, env-reflecting, one program for all. */
const paintCache = new Map();
export function paintMaterial(color) {
  if (!paintCache.has(color)) {
    paintCache.set(color, new THREE.MeshStandardMaterial({
      color, roughness: 0.32, metalness: 0.25, envMapIntensity: 0.9,
    }));
  }
  return paintCache.get(color);
}

/** Cabin glass: dark teal, near-mirror so the sky env does the talking. */
export const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d3f52, roughness: 0.06, metalness: 0.4, envMapIntensity: 1.6,
});

/** Tyre + hub in one vertex-coloured geometry, so wheels share this too. */
export const wheelMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.85, metalness: 0.05,
});

export const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8dee2, roughness: 0.18, metalness: 0.9, envMapIntensity: 1.2,
});

/** Unlit merged lights (head/tail lamps): bright colours read as lamps. */
export const lampGlowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Skin tones and outfit fabrics are plain matte standards, cached by colour. */
const fabricCache = new Map();
export function fabricMaterial(color) {
  if (!fabricCache.has(color)) {
    fabricCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }));
  }
  return fabricCache.get(color);
}
