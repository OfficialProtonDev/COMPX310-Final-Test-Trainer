// Tiny plotting helpers shared by the widgets. All return plain numbers/strings; no DOM access.

/** Linear scale: maps [d0, d1] onto [r0, r1]. Has .invert(). */
export function scale(d0, d1, r0, r1) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = (v) => r0 + (v - d0) * k;
  f.invert = (p) => d0 + (p - r0) / k;
  f.domain = [d0, d1];
  f.range = [r0, r1];
  return f;
}

/** "Nice" tick values covering [min, max] with about n ticks. */
export function ticks(min, max, n = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(1, n);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Format a number with up to dp decimals, trimming trailing zeros; uses a true minus sign. */
export function fmt(v, dp = 2) {
  if (v == null || Number.isNaN(v)) return '–';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  let s = (+v).toFixed(dp);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace(/^-/, '−');
}

/** Fixed decimals (keeps zeros), true minus sign. */
export function fix(v, dp = 3) {
  if (v == null || Number.isNaN(v)) return '–';
  const s = (+v).toFixed(dp);
  return (s.startsWith('-') && +s === 0 ? s.slice(1) : s).replace(/^-/, '−');
}

export const pct = (v, dp = 1) => (v == null || Number.isNaN(v) ? '–' : fmt(v * 100, dp) + '%');

/** SVG path through points [[x, y], ...] in data space. */
export function linePath(pts, X, Y) {
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (!Number.isFinite(y)) continue;
    d += (d ? 'L' : 'M') + X(x).toFixed(2) + ',' + Y(y).toFixed(2);
  }
  return d;
}

/** Closed band between lower and upper curves sampled at the same xs. */
export function bandPath(xs, lo, hi, X, Y) {
  let d = '';
  xs.forEach((x, i) => (d += (i ? 'L' : 'M') + X(x).toFixed(2) + ',' + Y(hi[i]).toFixed(2)));
  for (let i = xs.length - 1; i >= 0; i--) d += 'L' + X(xs[i]).toFixed(2) + ',' + Y(lo[i]).toFixed(2);
  return d + 'Z';
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const range = (n) => Array.from({ length: n }, (_, i) => i);
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Seeded RNG (mulberry32) so demos are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.normal = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  r.int = (n) => Math.floor(r() * n);
  return r;
}

export function shuffle(arr, r = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pointer position inside an SVG in viewBox units (works with CSS scaling). */
export function svgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  const e = evt.touches ? evt.touches[0] : evt;
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
