// k-means, step by step (W10b s5-18). Pure maths for KmeansStepper.jsx and tools/check-c.mjs.
import { rng } from '../lib/svg.js';

/** Blob spec: [cx, cy, sd, n]. Four blobs of different spreads (like the W10b s5 toy data), 200 points. */
export const BLOBS = [
  [-2.8, 2.75, 0.1, 40],
  [-2.8, 1.45, 0.14, 40],
  [-1.45, 2.3, 0.3, 55],
  [0.25, 2.15, 0.42, 65],
];

export function makeBlobs(seed = 5, spec = BLOBS) {
  const r = rng(seed);
  const pts = [];
  spec.forEach(([cx, cy, sd, n]) => {
    for (let i = 0; i < n; i++) pts.push([cx + r.normal() * sd, cy + r.normal() * sd]);
  });
  return pts;
}

const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

/** init='random': k distinct data points chosen at random as the first centres. */
export function initRandom(pts, k, r) {
  const idx = new Set();
  while (idx.size < Math.min(k, pts.length)) idx.add(r.int(pts.length));
  return [...idx].map((i) => pts[i].slice());
}

/** k-means++: first centre a random point; each next centre picked with probability ∝ D² to the nearest chosen centre. */
export function initPlusPlus(pts, k, r) {
  const cs = [pts[r.int(pts.length)].slice()];
  const D = pts.map((p) => d2(p, cs[0]));
  while (cs.length < k) {
    const tot = D.reduce((a, b) => a + b, 0);
    let t = r() * tot;
    let pick = pts.length - 1;
    for (let i = 0; i < pts.length; i++) {
      t -= D[i];
      if (t <= 0) {
        pick = i;
        break;
      }
    }
    cs.push(pts[pick].slice());
    pts.forEach((p, i) => (D[i] = Math.min(D[i], d2(p, cs[cs.length - 1]))));
  }
  return cs;
}

export function nearest(p, centres) {
  let best = 0;
  let bd = Infinity;
  centres.forEach((c, j) => {
    const d = d2(p, c);
    if (d < bd) {
      bd = d;
      best = j;
    }
  });
  return best;
}

/** Assignment step: every point goes to its nearest centre. */
export const assign = (pts, centres) => pts.map((p) => nearest(p, centres));

/** Update step: each centre moves to the mean of its points (a centre with no points stays put). */
export function update(pts, labels, centres) {
  const acc = centres.map(() => [0, 0, 0]);
  pts.forEach((p, i) => {
    const a = acc[labels[i]];
    a[0] += p[0];
    a[1] += p[1];
    a[2]++;
  });
  return centres.map((c, j) => (acc[j][2] ? [acc[j][0] / acc[j][2], acc[j][1] / acc[j][2]] : c.slice()));
}

/** Inertia (scikit-learn): sum of squared distances from each point to its assigned centre. */
export const inertia = (pts, labels, centres) => pts.reduce((s, p, i) => s + d2(p, centres[labels[i]]), 0);

/** Lloyd iterations from given centres until no label changes. */
export function lloyd(pts, centres, maxIter = 100) {
  let c = centres.map((x) => x.slice());
  let labels = assign(pts, c);
  let iters = 1;
  for (; iters < maxIter; iters++) {
    c = update(pts, labels, c);
    const next = assign(pts, c);
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    if (!changed) break;
  }
  c = update(pts, labels, c);
  return { centres: c, labels, iters, inertia: inertia(pts, labels, c) };
}

/** Best of nInit k-means++ runs (what KMeans(n_clusters=k, n_init=…) does). */
export function kmeansBest(pts, k, nInit = 10, seed = 42) {
  const r = rng(seed * 100 + k);
  let best = null;
  for (let i = 0; i < nInit; i++) {
    const run = lloyd(pts, initPlusPlus(pts, k, r));
    if (!best || run.inertia < best.inertia - 1e-12) best = run;
  }
  return best;
}

/** Mean silhouette coefficient: s = (b − a) / max(a, b); a = mean distance within own cluster, b = to the next-closest cluster. */
export function silhouette(pts, labels) {
  const k = Math.max(...labels) + 1;
  const n = pts.length;
  const size = Array(k).fill(0);
  labels.forEach((l) => size[l]++);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const sum = Array(k).fill(0);
    for (let j = 0; j < n; j++) if (j !== i) sum[labels[j]] += Math.sqrt(d2(pts[i], pts[j]));
    const own = labels[i];
    if (size[own] <= 1) continue; // singleton cluster: s = 0 (scikit-learn convention)
    const a = sum[own] / (size[own] - 1);
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own && size[c] > 0) b = Math.min(b, sum[c] / size[c]);
    total += (b - a) / Math.max(a, b);
  }
  return total / n;
}

/** Inertia (k = 1…8) and silhouette (k = 2…8) curves from k-means++ runs with a fixed seed. */
export function chooseKCurves(pts, kMax = 8) {
  const out = [];
  for (let k = 1; k <= kMax; k++) {
    const run = kmeansBest(pts, k);
    out.push({ k, inertia: run.inertia, sil: k >= 2 ? silhouette(pts, run.labels) : null });
  }
  return out;
}
