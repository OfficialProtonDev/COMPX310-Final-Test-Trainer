// Gradient descent: a 1-D convex cost and 2-D linear-regression paths (W5 s13-23). Pure functions, no DOM.
import { rng, shuffle, range } from '../lib/svg.js';

// ---------------------------------------------------------------- panel 1: J(θ) = (θ − 3)² + 1
export const THETA_START = -2;
export const THETA_MIN = 3;
export const J1 = (t) => (t - THETA_MIN) ** 2 + 1;
export const dJ1 = (t) => 2 * (t - THETA_MIN);
/** Learning rates offered by the slider (log-ish spacing; includes the slide's 0.02, 0.1 and 0.5). */
export const ETAS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1, 1.05, 1.1];

/** θ₀ … θ_steps with θ ← θ − η·J′(θ). */
export function gd1d(eta, theta0 = THETA_START, steps = 20) {
  const th = [theta0];
  for (let i = 0; i < steps; i++) th.push(th[i] - eta * dJ1(th[i]));
  return th;
}

/**
 * Each step multiplies the distance to the minimum by (1 − 2η) because J″ = 2.
 * slow: 0 < η small (still > 0.1 away after `steps`); converges; oscillates: 0.5 < η < 1 (overshoots but shrinks);
 * bounces: η = 1 (jumps between −2 and 8 for ever); diverges: η > 1.
 */
export function status1d(eta, steps = 20, theta0 = THETA_START) {
  const factor = 1 - 2 * eta;
  const a = Math.abs(factor);
  const left = Math.abs(theta0 - THETA_MIN) * a ** steps;
  let key;
  if (a > 1 + 1e-9) key = 'diverges';
  else if (a > 1 - 1e-9) key = 'bounces';
  else if (factor < -1e-12) key = 'oscillates';
  else if (left > 0.1) key = 'slow';
  else key = 'converges';
  return { key, factor, left };
}

// ---------------------------------------------------------------- panel 2: linear regression y = θ₀ + θ₁x
// Data in standardised units (mean 0, sd 1): y = 4 + 3x + noise, so the scaled minimum sits near (4, 3) like W5 s23.
// "Unscaled" uses the same points as raw x = SHIFT + SCALE·x (not centred): same model, stretched bowl.
export const UNSCALED = { shift: 2.4, scale: 0.8 };

export function makeData2d({ seed = 3, m = 50, noise = 1 } = {}) {
  const r = rng(seed);
  const raw = Array.from({ length: m }, () => r());
  const mu = raw.reduce((a, b) => a + b, 0) / m;
  const sd = Math.sqrt(raw.reduce((a, b) => a + (b - mu) ** 2, 0) / m);
  const xs = raw.map((v) => (v - mu) / sd);
  const y = xs.map((x) => 4 + 3 * x + noise * r.normal());
  return { xs, y, m };
}

/** Design rows [1, x] for the chosen feature version. */
export const design = (data, scaled, u = UNSCALED) => data.xs.map((x) => [1, scaled ? x : u.shift + u.scale * x]);

/** Quadratic form of the MSE cost: J(θ) = θᵀAθ − 2bᵀθ + c. Returns A, θ*, J* and A's eigen-decomposition. */
export function costForm(X, y) {
  const m = X.length;
  let a00 = 0;
  let a01 = 0;
  let a11 = 0;
  let b0 = 0;
  let b1 = 0;
  let c = 0;
  for (let i = 0; i < m; i++) {
    const [u, v] = X[i];
    a00 += u * u;
    a01 += u * v;
    a11 += v * v;
    b0 += u * y[i];
    b1 += v * y[i];
    c += y[i] * y[i];
  }
  [a00, a01, a11, b0, b1, c] = [a00, a01, a11, b0, b1, c].map((s) => s / m);
  const det = a00 * a11 - a01 * a01;
  const t0 = (a11 * b0 - a01 * b1) / det;
  const t1 = (a00 * b1 - a01 * b0) / det;
  const jmin = c - (b0 * t0 + b1 * t1);
  const tr = a00 + a11;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const lmax = tr / 2 + disc;
  const lmin = tr / 2 - disc;
  // eigenvector for lmax
  let vx = a01;
  let vy = lmax - a00;
  if (Math.abs(vx) < 1e-12 && Math.abs(vy) < 1e-12) {
    vx = 1;
    vy = 0;
  }
  const nv = Math.hypot(vx, vy);
  return { A: [[a00, a01], [a01, a11]], opt: [t0, t1], jmin, lmax, lmin, vmax: [vx / nv, vy / nv] };
}

export const cost = (X, y, th) => X.reduce((s, [u, v], i) => s + (th[0] * u + th[1] * v - y[i]) ** 2, 0) / X.length;

/** Points of the contour J = jmin + dj (an ellipse). */
export function ellipse(form, dj, n = 72) {
  const { opt, lmax, lmin, vmax } = form;
  const ra = Math.sqrt(dj / lmax);
  const rb = Math.sqrt(dj / Math.max(lmin, 1e-12));
  const vmin = [-vmax[1], vmax[0]];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    const a = ra * Math.cos(t);
    const b = rb * Math.sin(t);
    pts.push([opt[0] + a * vmax[0] + b * vmin[0], opt[1] + a * vmax[1] + b * vmin[1]]);
  }
  return pts;
}

/**
 * Gradient descent with a constant learning rate. batch = m → batch GD, 1 → stochastic, else mini-batch.
 * Each epoch visits the data once in a seeded shuffled order. Returns the θ after every update and the
 * index of the last update of each epoch (epochEnds[e] = path index after e epochs).
 */
export function gdPath(X, y, { eta, batch, epochs, start, seed = 1 }) {
  const m = X.length;
  const r = rng(seed);
  let th = start.slice();
  const path = [th];
  const epochEnds = [0];
  let diverged = false;
  for (let e = 0; e < epochs && !diverged; e++) {
    const idx = batch >= m ? range(m) : shuffle(range(m), r);
    for (let s = 0; s < m; s += batch) {
      const I = idx.slice(s, s + batch);
      let g0 = 0;
      let g1 = 0;
      for (const i of I) {
        const res = th[0] * X[i][0] + th[1] * X[i][1] - y[i];
        g0 += res * X[i][0];
        g1 += res * X[i][1];
      }
      const k = (2 / I.length) * eta;
      th = [th[0] - k * g0, th[1] - k * g1];
      path.push(th);
      if (!(Math.abs(th[0]) < 1e4 && Math.abs(th[1]) < 1e4)) {
        diverged = true;
        break;
      }
    }
    epochEnds.push(path.length - 1);
  }
  return { path, epochEnds, diverged };
}

/** Same model, other parameterisation: θ for standardised x → θ for raw x = shift + scale·x. */
export const toUnscaled = ([a, b], u = UNSCALED) => [a - (u.shift * b) / u.scale, b / u.scale];
