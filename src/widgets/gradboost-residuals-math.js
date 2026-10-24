// Gradient boosting with tiny 1-D regression trees (W7 s34-38).
// Data like the lecture: x in [-0.5, 0.5], y = 3x^2 + noise (sigma 0.05). Pure functions for tools/check-gradboost-residuals.mjs.
import { rng } from '../lib/svg.js';

/** Seeded training and validation sets drawn from the same distribution. */
export function makeData(seed = 1, nTrain = 60, nVal = 40, noise = 0.05) {
  const r = rng(seed);
  const draw = (n) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = r() - 0.5;
      pts.push([x, 3 * x * x + noise * r.normal()]);
    }
    return pts.sort((a, b) => a[0] - b[0]);
  };
  const train = draw(nTrain);
  const val = draw(nVal);
  return { train, val };
}

/**
 * Exhaustive-split regression tree on 1-D sorted x (squared error, min 1 sample per leaf, like sklearn's defaults).
 * xs must be sorted ascending. Returns a node: { leaf: true, value } or { t, left, right }.
 * In 1-D every node is a contiguous run of the sorted xs, so prefix sums make each split search O(n).
 */
export function fitTree(xs, ys, maxDepth) {
  const n = xs.length;
  const s1 = new Float64Array(n + 1);
  const s2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    s1[i + 1] = s1[i] + ys[i];
    s2[i + 1] = s2[i] + ys[i] * ys[i];
  }
  const sse = (a, b) => {
    const k = b - a;
    if (k <= 0) return 0;
    const s = s1[b] - s1[a];
    return s2[b] - s2[a] - (s * s) / k;
  };
  const build = (a, b, depth) => {
    const k = b - a;
    const value = (s1[b] - s1[a]) / k;
    if (depth >= maxDepth || k < 2) return { leaf: true, value, n: k };
    const parent = sse(a, b);
    if (parent <= 1e-15) return { leaf: true, value, n: k };
    let best = Infinity;
    let bi = -1;
    for (let i = a + 1; i < b; i++) {
      if (xs[i] === xs[i - 1]) continue; // can't split between equal x
      const c = sse(a, i) + sse(i, b);
      if (c < best - 1e-15) {
        best = c;
        bi = i;
      }
    }
    if (bi < 0) return { leaf: true, value, n: k };
    return { t: (xs[bi - 1] + xs[bi]) / 2, n: k, left: build(a, bi, depth + 1), right: build(bi, b, depth + 1) };
  };
  return build(0, n, 0);
}

export function predictTree(node, x) {
  while (!node.leaf) node = x <= node.t ? node.left : node.right;
  return node.value;
}

/** All split thresholds in a tree. */
export function thresholds(node, out = []) {
  if (!node.leaf) {
    out.push(node.t);
    thresholds(node.left, out);
    thresholds(node.right, out);
  }
  return out;
}

const mse = (pred, ys) => pred.reduce((s, p, i) => s + (p - ys[i]) ** 2, 0) / ys.length;

/**
 * Gradient boosting for squared error, as on the slides: the first tree fits y, each next tree fits the residuals
 * y - F(x) of the ensemble so far, and F_k = lr * (h_1 + ... + h_k).
 * Returns the trees, the residuals each tree was fit to, staged predictions and MSEs (index k-1 = after k trees).
 */
export function boost(train, val, nTrees, lr, maxDepth) {
  const xs = train.map((p) => p[0]);
  const ys = train.map((p) => p[1]);
  const vx = val.map((p) => p[0]);
  const vy = val.map((p) => p[1]);
  const F = new Array(xs.length).fill(0);
  const Fv = new Array(vx.length).fill(0);
  const trees = [];
  const resid = [];
  const trainMse = [];
  const valMse = [];
  for (let k = 0; k < nTrees; k++) {
    const r = ys.map((y, i) => y - F[i]);
    const h = fitTree(xs, r, maxDepth);
    trees.push(h);
    resid.push(r);
    for (let i = 0; i < xs.length; i++) F[i] += lr * predictTree(h, xs[i]);
    for (let i = 0; i < vx.length; i++) Fv[i] += lr * predictTree(h, vx[i]);
    trainMse.push(mse(F, ys));
    valMse.push(mse(Fv, vy));
  }
  let best = 0;
  for (let k = 1; k < valMse.length; k++) if (valMse[k] < valMse[best]) best = k;
  return { trees, resid, trainMse, valMse, best: best + 1 };
}

/** Ensemble prediction after k trees at x. */
export function predictStage(trees, k, lr, x) {
  let s = 0;
  for (let j = 0; j < k; j++) s += predictTree(trees[j], x);
  return lr * s;
}

/**
 * Exact step-function path data for f over [x0, x1], given its breakpoints (tree thresholds).
 * Returns [[xStart, xEnd, value], ...] segments.
 */
export function stepSegments(f, breaks, x0, x1) {
  const bs = [...new Set(breaks)].filter((b) => b > x0 && b < x1).sort((a, b) => a - b);
  const edges = [x0, ...bs, x1];
  const segs = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    segs.push([a, b, f((a + b) / 2)]);
  }
  return segs;
}
