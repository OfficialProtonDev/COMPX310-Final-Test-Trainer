// Pure maths for the Week 8 SVM widgets (svm-margin, kernel-lift, rbf-gamma-c). No DOM, no Preact.
//
// Solver: the soft-margin SVM dual
//   minimise ½ αᵀQα − Σα   subject to 0 ≤ αᵢ ≤ C,  Σ αᵢ tᵢ = 0,   Qᵢⱼ = tᵢ tⱼ K(xᵢ, xⱼ)
// solved by SMO with second-order working-set selection (Fan, Chen & Lin 2005 — the LIBSVM solver).
// Deterministic, and for ≤ 100 points it converges to the KKT tolerance in a few ms.
// Decision function h(x) = Σ αᵢ tᵢ K(xᵢ, x) + b; for the linear kernel w = Σ αᵢ tᵢ xᵢ (slide W8 s26).
import { rng } from '../lib/svg.js';

const TAU = 1e-12;

export const linearKernel = (a, b) => a[0] * b[0] + a[1] * b[1];
export const rbfKernel = (gamma) => (a, b) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.exp(-gamma * (dx * dx + dy * dy));
};

export function kernelMatrix(X, kern) {
  const n = X.length;
  const K = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = kern(X[i], X[j]);
      K[i][j] = v;
      K[j][i] = v;
    }
  }
  return K;
}

/**
 * SMO on a precomputed kernel matrix. t: labels ±1. Returns { alpha, b, iter, converged }.
 * eps is the KKT violation tolerance (max over I_up of −tG minus min over I_low of −tG).
 */
export function smo(K, t, C, { eps = 1e-6, maxIter } = {}) {
  const n = t.length;
  const alpha = new Float64Array(n);
  const G = new Float64Array(n).fill(-1); // gradient of the dual objective at α = 0
  const QD = new Float64Array(n);
  for (let i = 0; i < n; i++) QD[i] = K[i][i];
  const cap = maxIter ?? Math.max(20000, 2000 * n);
  let iter = 0;
  let converged = false;
  while (iter < cap) {
    // ---- working-set selection (WSS 3)
    let Gmax = -Infinity;
    let Gmax2 = -Infinity;
    let i = -1;
    let j = -1;
    let objMin = Infinity;
    for (let s = 0; s < n; s++) {
      if (t[s] === 1) {
        if (alpha[s] < C && -G[s] >= Gmax) {
          Gmax = -G[s];
          i = s;
        }
      } else if (alpha[s] > 0 && G[s] >= Gmax) {
        Gmax = G[s];
        i = s;
      }
    }
    if (i === -1) {
      converged = true;
      break;
    }
    const Ki = K[i];
    for (let s = 0; s < n; s++) {
      if (t[s] === 1) {
        if (alpha[s] > 0) {
          const gd = Gmax + G[s];
          if (G[s] >= Gmax2) Gmax2 = G[s];
          if (gd > 0) {
            const quad = QD[i] + QD[s] - 2 * Ki[s];
            const obj = -(gd * gd) / (quad > 0 ? quad : TAU);
            if (obj <= objMin) {
              j = s;
              objMin = obj;
            }
          }
        }
      } else if (alpha[s] < C) {
        const gd = Gmax - G[s];
        if (-G[s] >= Gmax2) Gmax2 = -G[s];
        if (gd > 0) {
          const quad = QD[i] + QD[s] - 2 * Ki[s];
          const obj = -(gd * gd) / (quad > 0 ? quad : TAU);
          if (obj <= objMin) {
            j = s;
            objMin = obj;
          }
        }
      }
    }
    if (Gmax + Gmax2 < eps || j === -1) {
      converged = true;
      break;
    }
    iter++;

    // ---- analytic update of the pair (i, j) with box clipping (LIBSVM Solver::Solve)
    const Kj = K[j];
    const oi = alpha[i];
    const oj = alpha[j];
    const Qij = t[i] * t[j] * Ki[j];
    if (t[i] !== t[j]) {
      let quad = QD[i] + QD[j] + 2 * Qij;
      if (quad <= 0) quad = TAU;
      const delta = (-G[i] - G[j]) / quad;
      const diff = alpha[i] - alpha[j];
      alpha[i] += delta;
      alpha[j] += delta;
      if (diff > 0) {
        if (alpha[j] < 0) {
          alpha[j] = 0;
          alpha[i] = diff;
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0;
        alpha[j] = -diff;
      }
      if (diff > 0) {
        if (alpha[i] > C) {
          alpha[i] = C;
          alpha[j] = C - diff;
        }
      } else if (alpha[j] > C) {
        alpha[j] = C;
        alpha[i] = C + diff;
      }
    } else {
      let quad = QD[i] + QD[j] - 2 * Qij;
      if (quad <= 0) quad = TAU;
      const delta = (G[i] - G[j]) / quad;
      const sum = alpha[i] + alpha[j];
      alpha[i] -= delta;
      alpha[j] += delta;
      if (sum > C) {
        if (alpha[i] > C) {
          alpha[i] = C;
          alpha[j] = sum - C;
        }
      } else if (alpha[j] < 0) {
        alpha[j] = 0;
        alpha[i] = sum;
      }
      if (sum > C) {
        if (alpha[j] > C) {
          alpha[j] = C;
          alpha[i] = sum - C;
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0;
        alpha[j] = sum;
      }
    }
    const di = alpha[i] - oi;
    const dj = alpha[j] - oj;
    for (let s = 0; s < n; s++) G[s] += t[i] * t[s] * Ki[s] * di + t[j] * t[s] * Kj[s] * dj;
  }

  // ---- bias: average over free support vectors, else midpoint of the feasible interval
  let ub = Infinity;
  let lb = -Infinity;
  let nFree = 0;
  let sumFree = 0;
  for (let s = 0; s < n; s++) {
    const yG = t[s] * G[s];
    if (alpha[s] >= C) {
      if (t[s] === -1) ub = Math.min(ub, yG);
      else lb = Math.max(lb, yG);
    } else if (alpha[s] <= 0) {
      if (t[s] === 1) ub = Math.min(ub, yG);
      else lb = Math.max(lb, yG);
    } else {
      nFree++;
      sumFree += yG;
    }
  }
  const rho = nFree > 0 ? sumFree / nFree : (ub + lb) / 2;
  return { alpha, b: -rho, iter, converged };
}

/** In-place Cholesky of a dense SPD matrix (array of Float64Array rows). Returns false if not PD. */
function cholInPlace(M, n) {
  for (let j = 0; j < n; j++) {
    const Mj = M[j];
    let d = Mj[j];
    for (let k = 0; k < j; k++) d -= Mj[k] * Mj[k];
    if (!(d > 0)) return false;
    d = Math.sqrt(d);
    Mj[j] = d;
    for (let i = j + 1; i < n; i++) {
      const Mi = M[i];
      let s = Mi[j];
      for (let k = 0; k < j; k++) s -= Mi[k] * Mj[k];
      Mi[j] = s / d;
    }
  }
  return true;
}
function cholSolveInPlace(L, n, b) {
  const x = Float64Array.from(b);
  for (let i = 0; i < n; i++) {
    let s = x[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
    x[i] = s / L[i][i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/**
 * Same dual QP as smo(), solved with a primal-dual interior-point method (Mehrotra predictor-corrector).
 * About 15–40 Newton steps whatever C is, so it stays fast when overlapping data pushes many α to C = 1000
 * (where SMO needs ~10⁵ tiny steps). Returns { alpha, b, iter, converged }; b is the equality multiplier.
 */
export function ipm(K, t, C, { tol = 1e-11, maxIter = 120 } = {}) {
  const n = t.length;
  const Q = Array.from({ length: n }, (_, i) => Float64Array.from(K[i], (v, j) => t[i] * t[j] * v));
  const x = new Float64Array(n).fill(Math.min(C / 2, 1));
  const z = new Float64Array(n).fill(1);
  const u = new Float64Array(n).fill(1);
  let nu = 0;
  const M = Array.from({ length: n }, () => new Float64Array(n));
  const rd = new Float64Array(n);
  // the upper-bound slack s = C − α is kept as its own variable: recomputing it loses all precision when α ≈ C
  const s = Float64Array.from(x, (v) => C - v);
  let iter = 0;
  let converged = false;
  const scale = 1 + Math.max(...Q.map((r, i) => Math.abs(r[i])));
  for (; iter < maxIter; iter++) {
    let rp = 0;
    let mu = 0;
    let rdn = 0;
    for (let i = 0; i < n; i++) {
      let q = 0;
      for (let j = 0; j < n; j++) q += Q[i][j] * x[j];
      rd[i] = q - 1 + nu * t[i] - z[i] + u[i];
      rdn = Math.max(rdn, Math.abs(rd[i]));
      rp += t[i] * x[i];
      mu += x[i] * z[i] + s[i] * u[i];
    }
    mu /= 2 * n;
    if (mu < tol && rdn < 1e-9 * scale && Math.abs(rp) < 1e-9 * (1 + C)) {
      converged = true;
      break;
    }
    // M = Q + diag(z/x + u/s), factorised once per iteration and used for both predictor and corrector
    for (let i = 0; i < n; i++) {
      M[i].set(Q[i]);
      M[i][i] += z[i] / x[i] + u[i] / s[i] + 1e-13 * scale;
    }
    if (!cholInPlace(M, n)) {
      // only happens extremely close to the optimum, when the barrier terms swamp Q in floating point
      converged = mu < 1e-8;
      break;
    }
    const Ma = cholSolveInPlace(M, n, t);
    let aMa = 0;
    for (let i = 0; i < n; i++) aMa += t[i] * Ma[i];
    const solve = (cx, cs) => {
      // cx, cs: complementarity targets for x·z and s·u (per component)
      const rhs = new Float64Array(n);
      for (let i = 0; i < n; i++) rhs[i] = -rd[i] - z[i] + u[i] + cx[i] / x[i] - cs[i] / s[i];
      const Mr = cholSolveInPlace(M, n, rhs);
      let aMr = 0;
      for (let i = 0; i < n; i++) aMr += t[i] * Mr[i];
      const dnu = (aMr + rp) / aMa;
      const dx = new Float64Array(n);
      const dz = new Float64Array(n);
      const du = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        dx[i] = Mr[i] - Ma[i] * dnu;
        dz[i] = -z[i] + cx[i] / x[i] - (z[i] / x[i]) * dx[i];
        du[i] = -u[i] + cs[i] / s[i] + (u[i] / s[i]) * dx[i];
      }
      return { dx, dz, du, dnu };
    };
    const stepTo = (d, frac) => {
      let a = 1;
      for (let i = 0; i < n; i++) {
        if (d.dx[i] < 0) a = Math.min(a, (-frac * x[i]) / d.dx[i]);
        if (d.dx[i] > 0) a = Math.min(a, (frac * s[i]) / d.dx[i]);
        if (d.dz[i] < 0) a = Math.min(a, (-frac * z[i]) / d.dz[i]);
        if (d.du[i] < 0) a = Math.min(a, (-frac * u[i]) / d.du[i]);
      }
      return a;
    };
    const zero = new Float64Array(n);
    const aff = solve(zero, zero);
    const aA = stepTo(aff, 1);
    let muAff = 0;
    for (let i = 0; i < n; i++) {
      muAff += (x[i] + aA * aff.dx[i]) * (z[i] + aA * aff.dz[i]) + (s[i] - aA * aff.dx[i]) * (u[i] + aA * aff.du[i]);
    }
    muAff /= 2 * n;
    const sigma = Math.min(1, (muAff / mu) ** 3);
    const cx = new Float64Array(n);
    const cs = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      cx[i] = sigma * mu - aff.dx[i] * aff.dz[i];
      cs[i] = sigma * mu + aff.dx[i] * aff.du[i]; // Δs_aff = −Δx_aff
    }
    const d = solve(cx, cs);
    const a = stepTo(d, 0.995);
    for (let i = 0; i < n; i++) {
      x[i] += a * d.dx[i];
      s[i] -= a * d.dx[i];
      z[i] += a * d.dz[i];
      u[i] += a * d.du[i];
    }
    nu += a * d.dnu;
  }
  return { alpha: x, b: nu, iter, converged };
}

/** Per-feature mean and (population) standard deviation, as StandardScaler computes them. */
export function scalerFit(X) {
  const n = X.length;
  const mu = [0, 0];
  const sd = [0, 0];
  for (const p of X) {
    mu[0] += p[0] / n;
    mu[1] += p[1] / n;
  }
  for (const p of X) {
    sd[0] += (p[0] - mu[0]) ** 2 / n;
    sd[1] += (p[1] - mu[1]) ** 2 / n;
  }
  return { mu, sd: sd.map((v) => Math.sqrt(v) || 1) };
}
export const scalerApply = (s, p) => [(p[0] - s.mu[0]) / s.sd[0], (p[1] - s.mu[1]) / s.sd[1]];
export const scalerInvert = (s, z) => [s.mu[0] + z[0] * s.sd[0], s.mu[1] + z[1] * s.sd[1]];

/**
 * Linear soft-margin SVM on 2-D points. pts: [{x, y, c}] with c = 'A' (t = +1) or 'B' (t = −1).
 * Returns null unless both classes are present.
 */
export function fitLinearSvm(pts, C, { solver = 'ipm', ...opts } = {}) {
  if (!pts.some((p) => p.c === 'A') || !pts.some((p) => p.c === 'B')) return null;
  const X = pts.map((p) => [p.x, p.y]);
  const t = pts.map((p) => (p.c === 'A' ? 1 : -1));
  const K = kernelMatrix(X, linearKernel);
  let r = solver === 'smo' ? smo(K, t, C, opts) : ipm(K, t, C, opts);
  if (!Number.isFinite(r.b) || r.alpha.some((a) => !Number.isFinite(a))) r = smo(K, t, C, { maxIter: 200000 }); // safety net
  const w = [0, 0];
  for (let i = 0; i < X.length; i++) {
    w[0] += r.alpha[i] * t[i] * X[i][0];
    w[1] += r.alpha[i] * t[i] * X[i][1];
  }
  // b is unique when some αᵢ is strictly between 0 and C. When every SV sits at α = C it is only pinned to an
  // interval; take its midpoint, as LIBSVM (sklearn SVC) does.
  const aMax = Math.max(...r.alpha);
  const atC = (a) => a >= C * (1 - 1e-6);
  const atZero = (a) => a <= 1e-6 * aMax;
  let b = r.b;
  if (!r.alpha.some((a) => !atC(a) && !atZero(a))) {
    let lo = -Infinity;
    let hi = Infinity;
    X.forEach((p, i) => {
      const m = w[0] * p[0] + w[1] * p[1];
      const tight = t[i] - m; // b that puts the point exactly on its street edge
      if (atZero(r.alpha[i]) === (t[i] === 1)) lo = Math.max(lo, tight);
      else hi = Math.min(hi, tight);
    });
    if (Number.isFinite(lo) && Number.isFinite(hi)) b = (lo + hi) / 2;
    else if (Number.isFinite(lo) || Number.isFinite(hi)) b = Number.isFinite(lo) ? lo : hi;
  }
  const norm = Math.hypot(w[0], w[1]);
  const h = X.map((p) => w[0] * p[0] + w[1] * p[1] + b);
  const margins = h.map((v, i) => t[i] * v); // functional margin tᵢ h(xᵢ): 1 on the street edge
  // support vectors = points on or inside the street (exactly the αᵢ > 0 points, up to ties on the edge)
  const isSv = margins.map((m) => m <= 1 + 1e-6);
  const sv = [];
  isSv.forEach((s, i) => s && sv.push(i));
  const violations = margins.filter((m) => m < 1 - 1e-3).length;
  const correct = margins.filter((m) => m > 0).length;
  return {
    w,
    b,
    alpha: Array.from(r.alpha),
    norm,
    width: norm > 0 ? 2 / norm : Infinity,
    sv,
    isSv,
    h,
    margins,
    violations,
    errors: X.length - correct,
    acc: correct / X.length,
    iter: r.iter,
    converged: r.converged,
  };
}

/** Kernel SVM (e.g. RBF) on points [[x1, x2], ...] with labels t = ±1. Returns a predictor. */
export function fitKernelSvm(X, t, C, kern, opts = {}) {
  const K = kernelMatrix(X, kern);
  const r = smo(K, t, C, opts);
  const svTol = 1e-9 * Math.max(1, C);
  const sv = [];
  r.alpha.forEach((a, i) => a > svTol && sv.push(i));
  const coef = sv.map((i) => r.alpha[i] * t[i]);
  const svX = sv.map((i) => X[i]);
  const decision = (p) => {
    let s = r.b;
    for (let k = 0; k < svX.length; k++) s += coef[k] * kern(svX[k], p);
    return s;
  };
  // training decision values from the kernel matrix (exact, no re-evaluation)
  const hTrain = X.map((_, i) => {
    let s = r.b;
    for (let k = 0; k < sv.length; k++) s += coef[k] * K[sv[k]][i];
    return s;
  });
  const correct = hTrain.filter((v, i) => v * t[i] > 0).length;
  const bounded = sv.filter((i) => r.alpha[i] >= C * (1 - 1e-9)).length;
  return { alpha: Array.from(r.alpha), b: r.b, sv, coef, svX, decision, hTrain, acc: correct / X.length, bounded, iter: r.iter, converged: r.converged };
}

/**
 * Decision values of an RBF-kernel fit on the grid zxs × zys (kernel-space coordinates), fast:
 * exp(−γ(dx² + dy²)) = exp(−γdx²)·exp(−γdy²), so each grid value is a sum of products with no exp in the inner loop.
 * Returns rows g[j][i] for (zxs[i], zys[j]).
 */
export function rbfGrid(fit, gamma, zxs, zys) {
  const m = fit.svX.length;
  const ex = zxs.map((zx) => Float64Array.from(fit.svX, (sv) => Math.exp(-gamma * (zx - sv[0]) * (zx - sv[0]))));
  return zys.map((zy) => {
    const ey = Float64Array.from(fit.svX, (sv, k) => fit.coef[k] * Math.exp(-gamma * (zy - sv[1]) * (zy - sv[1])));
    const row = new Float64Array(zxs.length);
    for (let i = 0; i < zxs.length; i++) {
      const e = ex[i];
      let v = fit.b;
      for (let k = 0; k < m; k++) v += e[k] * ey[k];
      row[i] = v;
    }
    return row;
  });
}

/** make_moons look-alike (sklearn): outer arc class 0, inner arc class 1, Gaussian noise, seeded. */
export function makeMoons(n = 70, noise = 0.2, seed = 42) {
  const r = rng(seed);
  const nOut = Math.floor(n / 2);
  const nIn = n - nOut;
  const pts = [];
  for (let k = 0; k < nOut; k++) {
    const a = (Math.PI * k) / (nOut - 1);
    pts.push({ x: Math.cos(a) + noise * r.normal(), y: Math.sin(a) + noise * r.normal(), c: 0 });
  }
  for (let k = 0; k < nIn; k++) {
    const a = (Math.PI * k) / (nIn - 1);
    pts.push({ x: 1 - Math.cos(a) + noise * r.normal(), y: 1 - Math.sin(a) - 0.5 + noise * r.normal(), c: 1 });
  }
  return pts;
}

/**
 * Clip the line w·p + b = c to the rectangle [x0,x1]×[y0,y1]. Returns [[xa,ya],[xb,yb]] or null.
 */
export function clipLine(w, b, c, x0, x1, y0, y1) {
  const out = [];
  const add = (x, y) => {
    if (x < x0 - 1e-9 || x > x1 + 1e-9 || y < y0 - 1e-9 || y > y1 + 1e-9) return;
    if (out.some((q) => Math.abs(q[0] - x) < 1e-9 && Math.abs(q[1] - y) < 1e-9)) return;
    out.push([x, y]);
  };
  if (Math.abs(w[1]) > 1e-12) {
    add(x0, (c - b - w[0] * x0) / w[1]);
    add(x1, (c - b - w[0] * x1) / w[1]);
  }
  if (Math.abs(w[0]) > 1e-12) {
    add((c - b - w[1] * y0) / w[0], y0);
    add((c - b - w[1] * y1) / w[0], y1);
  }
  return out.length >= 2 ? [out[0], out[1]] : null;
}

/** Clip a convex polygon to the half-plane w·p + b ≥ c (Sutherland–Hodgman, one edge). */
export function clipHalf(poly, w, b, c) {
  const f = (p) => w[0] * p[0] + w[1] * p[1] + b - c;
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k];
    const q = poly[(k + 1) % poly.length];
    const fp = f(p);
    const fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const s = fp / (fp - fq);
      out.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1])]);
    }
  }
  return out;
}

/**
 * Marching squares for the zero level of a grid of values g[j][i] (j rows along y, i columns along x),
 * vertices at xs[i], ys[j]. Returns segments [[xa, ya, xb, yb], ...] in data units.
 */
export function zeroContour(g, xs, ys) {
  const segs = [];
  const ny = ys.length - 1;
  const nx = xs.length - 1;
  const lerp = (a, b, va, vb) => a + ((b - a) * va) / (va - vb);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v0 = g[j][i]; // (xs[i], ys[j])
      const v1 = g[j][i + 1]; // (xs[i+1], ys[j])
      const v2 = g[j + 1][i + 1];
      const v3 = g[j + 1][i];
      const c = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const xa = xs[i];
      const xb = xs[i + 1];
      const ya = ys[j];
      const yb = ys[j + 1];
      const e = [
        () => [lerp(xa, xb, v0, v1), ya], // bottom edge 0-1
        () => [xb, lerp(ya, yb, v1, v2)], // right edge 1-2
        () => [lerp(xa, xb, v3, v2), yb], // top edge 3-2
        () => [xa, lerp(ya, yb, v0, v3)], // left edge 0-3
      ];
      const seg = (p, q) => {
        const a = e[p]();
        const b = e[q]();
        segs.push([a[0], a[1], b[0], b[1]]);
      };
      const centre = (v0 + v1 + v2 + v3) / 4 > 0;
      switch (c) {
        case 1: case 14: seg(3, 0); break;
        case 2: case 13: seg(0, 1); break;
        case 3: case 12: seg(3, 1); break;
        case 4: case 11: seg(1, 2); break;
        case 6: case 9: seg(0, 2); break;
        case 7: case 8: seg(3, 2); break;
        case 5:
          if (centre) { seg(3, 2); seg(0, 1); } else { seg(3, 0); seg(1, 2); }
          break;
        case 10:
          if (centre) { seg(3, 0); seg(1, 2); } else { seg(0, 1); seg(3, 2); }
          break;
        default:
      }
    }
  }
  return segs;
}
