// Bias/variance: bull's-eye shots and polynomial fits of growing degree (W3 s17-27, W4 s2-5). Pure functions.
import { rng } from '../lib/svg.js';

// ---------------------------------------------------------------- bull's-eye
const SHOT_SEED = 11;
const N_SHOTS = 15;
// Fixed standard-normal pairs so moving a slider only rescales/shifts the same 15 shots.
const Z = (() => {
  const r = rng(SHOT_SEED);
  const z = Array.from({ length: N_SHOTS }, () => [r.normal(), r.normal()]);
  // centre the draws so the cloud's mean is exactly the bias offset
  const mx = z.reduce((s, p) => s + p[0], 0) / N_SHOTS;
  const my = z.reduce((s, p) => s + p[1], 0) / N_SHOTS;
  return z.map(([a, b]) => [a - mx, b - my]);
})();

/** Shots in target-radius units (bull's-eye centre at 0,0; target radius 1). bias, variance in [0, 1]. */
export function shots(bias, variance) {
  const ang = (100 * Math.PI) / 180; // offset up and slightly left, like the slide
  const off = 0.72 * bias;
  const sd = 0.035 + 0.27 * variance;
  const cx = off * Math.cos(ang);
  const cy = off * Math.sin(ang);
  return { pts: Z.map(([a, b]) => [cx + sd * a, cy + sd * b]), mean: [cx, cy], sd, off };
}

export const level = (v) => (v < 0.35 ? 'low' : 'high');

// ---------------------------------------------------------------- polynomial fits
export const X_RANGE = [-3, 3];
export const trueF = (x) => 0.5 * x * x + x + 2; // the slide's y = 0.5x² + x + 2 (+ noise)

/** Training and held-out validation points from the quadratic plus Gaussian noise (fixed seed). */
export function makePolyData({ seed = 84, nTrain = 20, nVal = 40, noise = 1 } = {}) {
  const r = rng(seed);
  const pt = () => {
    const x = X_RANGE[0] + (X_RANGE[1] - X_RANGE[0]) * r();
    return [x, trueF(x) + noise * r.normal()];
  };
  const train = Array.from({ length: nTrain }, pt).sort((a, b) => a[0] - b[0]);
  const val = Array.from({ length: nVal }, pt).sort((a, b) => a[0] - b[0]);
  return { train, val };
}

const toU = (x) => x / 3; // scale x to [-1, 1] so high powers stay well-behaved

/** Solve A x = b by Gaussian elimination with partial pivoting (A is copied). */
export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c] || 1e-300;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / piv;
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / (M[r][r] || 1e-300);
  }
  return x;
}

/** Least-squares polynomial of the given degree via the normal equations (XᵀX + ridge·I) w = Xᵀy, x scaled to [-1, 1]. */
export function polyFit(points, degree, ridge = 1e-8) {
  const n = degree + 1;
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const b = Array(n).fill(0);
  for (const [x, y] of points) {
    const u = toU(x);
    const pw = [1];
    for (let j = 1; j < n; j++) pw.push(pw[j - 1] * u);
    for (let i = 0; i < n; i++) {
      b[i] += pw[i] * y;
      for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j];
    }
  }
  for (let i = 0; i < n; i++) A[i][i] += ridge;
  return solve(A, b);
}

export function polyEval(w, x) {
  const u = toU(x);
  let s = 0;
  for (let j = w.length - 1; j >= 0; j--) s = s * u + w[j];
  return s;
}

export const rmse = (w, pts) => Math.sqrt(pts.reduce((s, [x, y]) => s + (polyEval(w, x) - y) ** 2, 0) / pts.length);

/** Training and validation RMSE for degrees 1..maxDeg. */
export function errorCurve(data, maxDeg = 15) {
  const out = [];
  for (let d = 1; d <= maxDeg; d++) {
    const w = polyFit(data.train, d);
    out.push({ d, w, train: rmse(w, data.train), val: rmse(w, data.val) });
  }
  return out;
}
