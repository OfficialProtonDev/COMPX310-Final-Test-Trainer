// Impurity of a decision-tree node and of a split (W2 s15, s18). Pure functions, no DOM.

export const total = (counts) => counts.reduce((a, b) => a + b, 0);
export const probs = (counts) => {
  const n = total(counts);
  return counts.map((c) => (n > 0 ? c / n : 0));
};

/** Gini = 1 − Σ pᵢ² (2 classes: 2r(1 − r)). NaN for an empty node. */
export function gini(counts) {
  const n = total(counts);
  if (!(n > 0)) return NaN;
  return 1 - probs(counts).reduce((s, p) => s + p * p, 0);
}

/** Entropy = −Σ pᵢ log pᵢ, in bits for base 2 (sklearn) or nats for base e (the slide's 2-class form uses ln). */
export function entropy(counts, base = 2) {
  const n = total(counts);
  if (!(n > 0)) return NaN;
  const lb = Math.log(base);
  const h = -probs(counts).reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0) / lb;
  return Math.abs(h) < 1e-15 ? 0 : h;
}

/** Misclassification rate = 1 − max pᵢ. */
export function misclass(counts) {
  const n = total(counts);
  if (!(n > 0)) return NaN;
  return 1 - Math.max(...probs(counts));
}

export const MEASURES = {
  gini: { label: 'Gini', fn: (c) => gini(c) },
  entropy: { label: 'Entropy', fn: (c, base) => entropy(c, base) },
  misclass: { label: 'Misclassification', fn: (c) => misclass(c) },
};

/**
 * Evaluate a split: the parent is left + right. Each child's impurity is weighted by its share of the samples.
 * Returns impurities for every measure plus the weighted child impurity and the decrease (parent − weighted).
 */
export function evalSplit(left, right, base = 2) {
  const parent = left.map((c, i) => c + (right[i] || 0));
  const nl = total(left);
  const nr = total(right);
  const n = nl + nr;
  const out = { parent, n, nl, nr };
  for (const [k, m] of Object.entries(MEASURES)) {
    const p = m.fn(parent, base);
    const l = m.fn(left, base);
    const r = m.fn(right, base);
    const weighted = n > 0 ? (nl > 0 ? (nl / n) * l : 0) + (nr > 0 ? (nr / n) * r : 0) : NaN;
    out[k] = { parent: p, left: l, right: r, weighted, decrease: p - weighted };
  }
  return out;
}

/** The W2 s18 plot_tree example (iris, 112 training samples). */
export const IRIS = {
  root: { counts: [37, 34, 41], rule: 'x[3] ≤ 0.8' },
  leftLeaf: { counts: [37, 0, 0] },
  right: { counts: [0, 34, 41], rule: 'x[2] ≤ 4.95' },
  leaf1: { counts: [0, 33, 3] },
  leaf2: { counts: [0, 1, 38] },
};
