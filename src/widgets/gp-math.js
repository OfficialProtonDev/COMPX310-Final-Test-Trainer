// Pure maths for the Week 9 widgets (bayes-slopes, gp-playground). No DOM, no Preact.
import { rng } from '../lib/svg.js';

/** Standard normal CDF Φ(z) (erf via Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const k = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * k - 1.453152027) * k + 1.421413741) * k - 0.284496736) * k + 0.254829592) * k * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

// ------------------------------------------------------------------ Part 1: three candidate slopes (W9b s14–15)
/**
 * Discrete Bayes over candidate slopes with the intercept fixed: prediction = intercept + w·x,
 * likelihood score = exp(−e²/(2σ²)) (the slide's "relative score"), posterior ∝ prior × score.
 */
export function discretePosterior({ slopes, priors, x = 2, y = 20, intercept = 18, sigma = 1 }) {
  const psum = priors.reduce((a, b) => a + Math.max(0, b), 0);
  const rows = slopes.map((w, i) => {
    const pred = intercept + w * x;
    const miss = y - pred;
    const score = Math.exp(-(miss * miss) / (2 * sigma * sigma));
    const prior = psum > 0 ? Math.max(0, priors[i]) / psum : NaN;
    return { w, pred, miss, score, prior, joint: prior * score };
  });
  const z = rows.reduce((a, r) => a + r.joint, 0);
  rows.forEach((r) => (r.post = z > 0 ? r.joint / z : NaN));
  return { rows, evidence: z };
}

// ------------------------------------------------------------------ Part 2: Bayesian linear regression
/**
 * Weights w = (w₀, w₁), features φ(x) = (1, x), prior w ~ N(0, α⁻¹I), noise precision β = 1/σ².
 * Posterior: S = (αI + βΦᵀΦ)⁻¹, m = βSΦᵀy.
 */
export function blrPosterior(xs, ys, alpha, beta) {
  let a = alpha + beta * xs.length; // [a b; b d] = αI + βΦᵀΦ
  let b = 0;
  let d = alpha;
  let r0 = 0;
  let r1 = 0;
  xs.forEach((x, i) => {
    b += beta * x;
    d += beta * x * x;
    r0 += beta * ys[i];
    r1 += beta * x * ys[i];
  });
  const det = a * d - b * b;
  const S = [
    [d / det, -b / det],
    [-b / det, a / det],
  ];
  const m = [S[0][0] * r0 + S[0][1] * r1, S[1][0] * r0 + S[1][1] * r1];
  return { m, S };
}

/** Predictive mean and std at x: mean = mᵀφ, var = 1/β + φᵀSφ (noise + weight uncertainty). */
export function blrPredict({ m, S }, beta, x) {
  const mean = m[0] + m[1] * x;
  const varW = S[0][0] + 2 * S[0][1] * x + S[1][1] * x * x;
  return { mean, std: Math.sqrt(1 / beta + varW), stdLine: Math.sqrt(Math.max(0, varW)) };
}

/** Draw weight vectors from N(m, S) with fixed standard-normal draws zs ([[z0, z1], ...]). */
export function blrSamples({ m, S }, zs) {
  const l00 = Math.sqrt(S[0][0]);
  const l10 = S[1][0] / l00;
  const l11 = Math.sqrt(Math.max(0, S[1][1] - l10 * l10));
  return zs.map(([z0, z1]) => [m[0] + l00 * z0, m[1] + l10 * z0 + l11 * z1]);
}

// ------------------------------------------------------------------ Gaussian processes (W9a)
export const rbf = (l, sf) => (a, b) => sf * sf * Math.exp(-((a - b) * (a - b)) / (2 * l * l));

/** Cholesky L (lower, row arrays) of a symmetric matrix; adds jitter·I, increasing it until it works. */
export function cholesky(A, jitter = 0) {
  const n = A.length;
  for (let attempt = 0; attempt < 8; attempt++) {
    const j = attempt === 0 ? jitter : Math.max(jitter, 1e-10) * 10 ** attempt;
    const L = Array.from({ length: n }, () => new Float64Array(n));
    let ok = true;
    for (let c = 0; c < n && ok; c++) {
      let s = A[c][c] + j;
      for (let k = 0; k < c; k++) s -= L[c][k] * L[c][k];
      if (!(s > 0)) {
        ok = false;
        break;
      }
      const d = Math.sqrt(s);
      L[c][c] = d;
      for (let r = c + 1; r < n; r++) {
        let v = A[r][c];
        for (let k = 0; k < c; k++) v -= L[r][k] * L[c][k];
        L[r][c] = v / d;
      }
    }
    if (ok) return { L, jitter: j };
  }
  return null;
}

/** Solve L x = b (forward substitution). */
export function forwardSub(L, b) {
  const n = b.length;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}
/** Solve Lᵀ x = b (back substitution). */
export function backSub(L, b) {
  const n = b.length;
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/**
 * GP regression with kernel k = σf²·exp(−(x−x′)²/2l²) + σn²·δ (RBF + WhiteKernel) and constant prior mean.
 * Returns the posterior (or prior, with no data) at xs: mean, latent variance of f, predictive std of y
 * (= sqrt(var_f + σn²), what sklearn's predict(return_std=True) reports when the kernel includes WhiteKernel),
 * and the latent covariance matrix for drawing sample functions.
 */
export function gpPosterior({ X, y, xs, l, sf, sn, mean0 = 0 }) {
  const k = rbf(l, sf);
  const N = xs.length;
  const n = X.length;
  const cov = Array.from({ length: N }, (_, i) => Float64Array.from(xs, (b) => k(xs[i], b)));
  const mean = new Float64Array(N).fill(mean0);
  if (n > 0) {
    const Kxx = X.map((a, i) => X.map((b, j) => k(a, b) + (i === j ? sn * sn : 0)));
    const ch = cholesky(Kxx);
    const L = ch.L;
    const alpha = backSub(L, forwardSub(L, y.map((v) => v - mean0)));
    const V = []; // V[:, j] = L⁻¹ k(X, xs_j), stored per test point
    for (let j = 0; j < N; j++) {
      const ks = X.map((a) => k(a, xs[j]));
      let m = mean0;
      for (let i = 0; i < n; i++) m += ks[i] * alpha[i];
      mean[j] = m;
      V.push(forwardSub(L, ks));
    }
    for (let a = 0; a < N; a++) {
      for (let b = a; b < N; b++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += V[a][i] * V[b][i];
        cov[a][b] -= s;
        if (b !== a) cov[b][a] = cov[a][b];
      }
    }
  }
  const varF = Float64Array.from(xs, (_, j) => Math.max(0, cov[j][j]));
  const std = Float64Array.from(varF, (v) => Math.sqrt(v + sn * sn));
  return { mean, varF, std, cov };
}

/** Sample functions from N(mean, cov) using fixed standard-normal vectors zs. Jitter keeps the Cholesky stable. */
export function gpSamples(mean, cov, zs, scale = 1) {
  const ch = cholesky(cov, 1e-8 * scale);
  if (!ch) return [];
  const { L } = ch;
  const N = mean.length;
  return zs.map((z) => {
    const f = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let s = mean[i];
      const Li = L[i];
      for (let k = 0; k <= i; k++) s += Li[k] * z[k];
      f[i] = s;
    }
    return f;
  });
}

/** Fixed standard-normal draws (seeded) so sample curves change smoothly as sliders move. */
export function normals(rows, cols, seed = 1) {
  const r = rng(seed);
  return Array.from({ length: rows }, () => Float64Array.from({ length: cols }, () => r.normal()));
}
