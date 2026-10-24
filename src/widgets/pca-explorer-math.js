// PCA on a 2-D cloud + choosing the number of components (W10a s9-13). Pure maths for PcaExplorer.jsx and tools/check-c.mjs.
import { rng } from '../lib/svg.js';

/** ~120 points from a correlated 2-D Gaussian (fixed seed), centred near the origin like W10a s9. */
export function makeCloud(n = 120, seed = 9, angleDeg = 35, s1 = 0.52, s2 = 0.23) {
  const r = rng(seed);
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = r.normal() * s1;
    const v = r.normal() * s2;
    pts.push([u * c - v * s, u * s + v * c]);
  }
  return pts;
}

/** Sample mean and covariance (n − 1 denominator, as numpy/scikit-learn). */
export function cov2(pts) {
  const n = pts.length;
  let mx = 0;
  let my = 0;
  for (const [x, y] of pts) {
    mx += x;
    my += y;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
    syy += (y - my) ** 2;
  }
  return { mx, my, sxx: sxx / (n - 1), sxy: sxy / (n - 1), syy: syy / (n - 1) };
}

/** Eigen-decomposition of the 2×2 covariance: variances along PC1/PC2 and the PC1 angle in degrees [0, 180). */
export function pca2(C) {
  const { sxx, sxy, syy } = C;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  let deg = ((0.5 * Math.atan2(2 * sxy, sxx - syy)) * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return { l1, l2, deg, ratio: [l1 / tr, l2 / tr] };
}

/** Variance of the projections onto the unit direction at angle deg (uᵀ Σ u). */
export function varAlong(C, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return C.sxx * c * c + 2 * C.sxy * c * s + C.syy * s * s;
}

/** Scalar projection (z) of each point onto the direction through the mean, and the foot of the perpendicular. */
export function project(pts, C, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => {
    const z = (x - C.mx) * c + (y - C.my) * s;
    return { z, fx: C.mx + z * c, fy: C.my + z * s };
  });
}

/** Cumulative sums, rounded to 1e-9 so 0.30 + 0.18 + … compares cleanly against a threshold like 0.95. */
export function cumsum(v) {
  let s = 0;
  return v.map((x) => (s = Math.round((s + x) * 1e9) / 1e9));
}

/** d = np.argmax(cumsum >= t) + 1 (the smallest number of components reaching the threshold). */
export function chooseD(ratios, t) {
  const cs = cumsum(ratios);
  const i = cs.findIndex((c) => c >= t - 1e-12);
  return i < 0 ? ratios.length : i + 1;
}

/** Elbow of the cumulative curve: the point farthest above the chord from (0, 0) to (n, total). */
export function elbow(ratios) {
  const cs = cumsum(ratios);
  const n = cs.length;
  const tot = cs[n - 1];
  let best = 1;
  let bestGap = -Infinity;
  cs.forEach((c, i) => {
    const gap = c - (tot * (i + 1)) / n;
    if (gap > bestGap) {
      bestGap = gap;
      best = i + 1;
    }
  });
  return best;
}

/** The 12-component explained_variance_ratio_ used in the "how many components" panel (sums to 1.0). */
export const RATIOS12 = [0.3, 0.18, 0.12, 0.09, 0.07, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.01];
