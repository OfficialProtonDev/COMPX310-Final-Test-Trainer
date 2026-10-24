// DBSCAN core / border / outlier labelling (W10b s32-37; 2019 practice paper Q53). Pure maths for DbscanLab.jsx and tools/check-c.mjs.
import { rng } from '../lib/svg.js';

/**
 * DBSCAN. includeSelf = true counts the point itself in its ε-neighbourhood (scikit-learn, Géron);
 * false counts neighbours only. Distance ≤ eps counts as inside.
 * Returns kind[i] ∈ 'C' | 'B' | 'O', label[i] (cluster index or −1 for noise), count[i], nbrs[i].
 */
export function dbscan(pts, eps, minSamples, includeSelf = true) {
  const n = pts.length;
  const e2 = eps * eps + 1e-12;
  const nbrs = pts.map((p, i) => {
    const out = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = p[0] - pts[j][0];
      const dy = p[1] - pts[j][1];
      if (dx * dx + dy * dy <= e2) out.push(j);
    }
    return out;
  });
  const count = nbrs.map((nb) => nb.length + (includeSelf ? 1 : 0));
  const core = count.map((c) => c >= minSamples);
  const label = Array(n).fill(-1);
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (!core[i] || label[i] !== -1) continue;
    // grow a new cluster from this core point through chains of core points
    label[i] = k;
    const queue = [i];
    while (queue.length) {
      const q = queue.shift();
      for (const j of nbrs[q]) {
        if (label[j] !== -1) continue;
        label[j] = k; // core neighbours extend the cluster; non-core ones become border points
        if (core[j]) queue.push(j);
      }
    }
    k++;
  }
  const kind = label.map((l, i) => (core[i] ? 'C' : l >= 0 ? 'B' : 'O'));
  return { kind, label, count, nbrs, clusters: k, outliers: kind.filter((x) => x === 'O').length };
}

/** 2019 practice paper Q53: seven points read off the figure (units), ε = 1.9 = the drawn circles' radius. */
export const EXAM_POINTS = [
  [0.36, 3.29],
  [1.46, 4.04],
  [5.08, 1.39],
  [8.58, 4.07],
  [10.29, 3.98],
  [11.58, 4.58],
  [11.74, 3.6],
];
export const EXAM_EPS = 1.9;

/** Two interleaving half circles (like make_moons(noise=…)), fixed seed. */
export function makeMoons(n = 100, noise = 0.07, seed = 3) {
  const r = rng(seed);
  const pts = [];
  const h = Math.floor(n / 2);
  for (let i = 0; i < h; i++) {
    const t = (Math.PI * i) / (h - 1);
    pts.push([Math.cos(t) + r.normal() * noise, Math.sin(t) + r.normal() * noise]);
  }
  for (let i = 0; i < n - h; i++) {
    const t = (Math.PI * i) / (n - h - 1);
    pts.push([1 - Math.cos(t) + r.normal() * noise, 0.5 - Math.sin(t) + r.normal() * noise]);
  }
  return pts;
}

/** Three blobs plus uniform background noise, fixed seed. */
export function makeBlobsNoise(seed = 11) {
  const r = rng(seed);
  const pts = [];
  [
    [-0.55, 0.6, 0.12, 28],
    [0.65, 0.75, 0.15, 30],
    [0.15, -0.35, 0.13, 28],
  ].forEach(([cx, cy, sd, m]) => {
    for (let i = 0; i < m; i++) pts.push([cx + r.normal() * sd, cy + r.normal() * sd]);
  });
  for (let i = 0; i < 14; i++) pts.push([-1.3 + r() * 2.6, -1 + r() * 2.2]);
  return pts;
}
