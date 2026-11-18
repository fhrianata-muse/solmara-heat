// materials.js — Solmara Bay's one shared surface library.
//
// Every mesh in the game takes its material from here: car paint, cabin
// glass, chrome, rubber, fabrics, and the seeded canvas textures the city
// wears (asphalt, sidewalk, sand, sea, pier wood, painted signs, and THREE
// deco facade rhythms). One material-role set, reused everywhere — a surface
// invented inside a builder file is a bug, not a shortcut (LOOK.md).
// Textures are painted by deterministic seeded brushes, so the city looks
// identical on every load and in every screenshot.

/** Deterministic brush RNG: same seed, same pixels, every time. */
export function texRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 22695477 + 1) >>> 0; return s / 4294967296; };
}

/** Paint a canvas texture with `draw(ctx, w, h, rand)`; colour maps are sRGB. */
export function canvasTexture(w, h, draw, seed = 7) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h, texRandom(seed));
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Scale a geometry's UVs so its texture tiles once per world size given. */
export function tileUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _col = new THREE.Color();

/**
 * Merge transformed, coloured parts into one BufferGeometry with vertex
 * colours — the kit-bash workhorse for trim, props and car detail, so a
 * whole family of small parts costs a single draw call. Part shape:
 * { geo, color, x, y, z, rx, ry, rz, sx, sy, sz } (only geo/color required).
 */
export function mergeParts(parts) {
  const positions = [], normals = [], uvs = [], colors = [];
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    _euler.set(part.rx || 0, part.ry || 0, part.rz || 0);
    _quat.setFromEuler(_euler);
    _mat4.compose(
      new THREE.Vector3(part.x || 0, part.y || 0, part.z || 0), _quat,
      new THREE.Vector3(part.sx || 1, part.sy || 1, part.sz || 1));
    g.applyMatrix4(_mat4);
    _col.set(part.color);
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
    for (let i = 0; i < pa.count; i++) {
      positions.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      normals.push(na.getX(i), na.getY(i), na.getZ(i));
      uvs.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
      colors.push(_col.r, _col.g, _col.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
}

/** The one material every vertex-coloured merged part wears. */
export const partMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide,
});

function grain(ctx, w, h, rand, count, tones, alphaCap, sizeCap = 2) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
    ctx.globalAlpha = 0.05 + rand() * alphaCap;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * sizeCap, 1 + rand() * sizeCap);
  }
  ctx.globalAlpha = 1;
}

/** Asphalt, one 12 m patch: dark base, aggregate grain, oil wear, patch seams. */
export function asphaltTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    // Painted a tone bright on purpose: an sRGB colour map decodes darker
    // than the same hex as a flat material colour, so the patch is lifted
    // to land on LOOK.md's #3C4147 in the render.
    ctx.fillStyle = '#596069';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, 2600, ['#474d55', '#666e78', '#788089'], 0.16);
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = '#33383f';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 22 + r() * 40, 10 + r() * 18, r() * 3, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 0.16;
    ctx.fillRect(0, r() * h, w, 2);
    ctx.globalAlpha = 1;
  }, 101);
}

/** Sidewalk, one 4 m tile of 2×2 slabs: grout lines, grain, corner chips. */
export function sidewalkTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#cbc3b5';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, 1500, ['#b8b19f', '#d9d3c3', '#a9a28d'], 0.14);
    ctx.strokeStyle = 'rgba(88,82,68,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, 103);
}

/** Sand: warm base flecked with shell tones. */
export function sandTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#ecd9a1';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, 1900, ['#ddc384', '#f7e8bb', '#ccb36f'], 0.2);
  }, 107);
}

/** Sea surface: deep teal crossed by short sun-sparkle strokes. */
export function waterTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#1f8aad';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = r() < 0.5 ? '#63c6de' : '#166e8c';
      ctx.globalAlpha = 0.12 + r() * 0.25;
      ctx.lineWidth = 1 + r() * 1.6;
      const y = r() * h, x = r() * w, len = 8 + r() * 30;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (r() - 0.5) * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, 109);
}

/** One framed window: plaster reveal, gradient glass, diagonal sky shine. */
function paintWindow(ctx, x, y, w, h) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#93c6da');
  grad.addColorStop(0.45, '#33566b');
  grad.addColorStop(1, '#264759');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,250,240,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,50,35,0.26)';
  ctx.fillRect(x - 3, y + h + 5, w + 6, 5); // ledge shadow under the sill
}

/**
 * Deco facades in THREE window rhythms, so the skyline never repeats one
 * beat (city.js assigns a rhythm per building):
 *   0 classic — 4×3 framed grid, a trim line per floor (tile 10.4×9.3 m)
 *   1 slots   — 3×4 tall narrow windows between pilaster stripes (7.8×12.4 m)
 *   2 ribbons — 5×2 wide windows over a continuous sill band (13.0×6.2 m)
 * The plaster is painted bright; the building's own tint colours it.
 */
export function facadeTexture(variant = 0) {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#e9ddc3';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, 700, ['#d9ccac', '#f5edd9'], 0.1);
    if (variant === 1) {
      const cols = 3, rows = 4, cw = w / cols, ch = h / rows;
      for (let col = 0; col <= cols; col++) { // pilaster stripes
        ctx.fillStyle = 'rgba(120,100,70,0.30)';
        ctx.fillRect(col * cw - 3, 0, 6, h);
      }
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          paintWindow(ctx, col * cw + 19, row * ch + 10, cw - 38, ch - 22);
        }
      }
    } else if (variant === 2) {
      const cols = 5, rows = 2, cw = w / cols, ch = h / rows;
      for (let row = 0; row < rows; row++) {
        ctx.fillStyle = '#f08a6b'; // painted awning stripe above each ribbon
        ctx.fillRect(0, row * ch + 6, w, 9);
        ctx.fillStyle = 'rgba(120,100,70,0.4)'; // continuous sill band
        ctx.fillRect(0, (row + 1) * ch - 12, w, 5);
        for (let col = 0; col < cols; col++) {
          paintWindow(ctx, col * cw + 5, row * ch + 24, cw - 10, ch - 44);
        }
      }
    } else {
      const cols = 4, rows = 3, cw = w / cols, ch = h / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          paintWindow(ctx, col * cw + 13, row * ch + 15, cw - 26, ch - 34);
        }
        ctx.fillStyle = 'rgba(120,100,70,0.35)';
        ctx.fillRect(0, (row + 1) * ch - 2, w, 2); // floor trim line
      }
    }
  }, 113 + variant * 6);
}

/** Pier planks: boards with grain, gaps and the odd dark stain. */
export function woodTexture() {
  return canvasTexture(256, 256, (ctx, w, h, r) => {
    ctx.fillStyle = '#8b6743';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, 1200, ['#78582f', '#9d784f'], 0.18, 5);
    ctx.fillStyle = 'rgba(40,26,12,0.6)';
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 3);
  }, 127);
}

/** Painted sign board: deco border, bold centred name. */
export function signTexture(text, bg, fg) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg;
    ctx.font = '800 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  }, 131);
}

/** Vertical sky gradient for the dome and the PMREM environment. */
export function skyTexture() {
  const t = canvasTexture(32, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2e7cd6');
    grad.addColorStop(0.52, '#79c0e8');
    grad.addColorStop(0.78, '#bfe3f2');
    grad.addColorStop(1, '#f2e3c6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 137);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Soft radial glow disc (white; tinted by the material that wears it). */
export function glowDiscTexture() {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.42)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 139);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Car paint, cached per colour + finish. opts can override the house finish
 * ({ roughness, metalness, env }) — the hero coupe uses that to keep its
 * deep red from washing pink under the sky environment (LOOK.md v3).
 */
const paintCache = new Map();
export function paintMaterial(color, opts = {}) {
  const finish = {
    roughness: opts.roughness ?? 0.32,
    metalness: opts.metalness ?? 0.25,
    env: opts.env ?? 0.9,
  };
  const key = `${color}|${finish.roughness}|${finish.metalness}|${finish.env}`;
  if (!paintCache.has(key)) {
    paintCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: finish.roughness, metalness: finish.metalness,
      envMapIntensity: finish.env,
    }));
  }
  return paintCache.get(key);
}

/** Cabin glass: dark teal, near-mirror, so the sky env does the talking. */
export const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d3f52, roughness: 0.06, metalness: 0.4, envMapIntensity: 1.6,
});

/** Wheels wear this: vertex-coloured tyre + hub in one geometry. */
export const wheelMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.85, metalness: 0.05,
});

export const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8dee2, roughness: 0.18, metalness: 0.9, envMapIntensity: 1.2,
});

/** Unlit merged lamps (head/tail lights): flat bright colour reads as lit. */
export const lampGlowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Skin tones and outfit fabrics: matte standards, cached by colour. */
const fabricCache = new Map();
export function fabricMaterial(color) {
  if (!fabricCache.has(color)) {
    fabricCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }));
  }
  return fabricCache.get(color);
}
