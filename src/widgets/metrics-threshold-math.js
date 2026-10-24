// Confusion matrix, precision/recall/F1 and PR/ROC curves for a thresholded score (W4 s11-24). Pure functions.

// 24 decision scores of a "5-detector" (positive = a 5). The classes overlap, like the slide's digits.
export const POS24 = [-1.35, -0.45, 0.45, 1.05, 1.45, 1.95, 2.35, 2.95, 3.45, 4.05];
export const NEG24 = [-4.15, -3.65, -3.15, -2.75, -2.35, -1.95, -1.55, -1.15, -0.75, -0.25, 0.25, 0.75, 1.65, 2.65];
export const DATA24 = [...POS24.map((s) => ({ s, y: 1 })), ...NEG24.map((s) => ({ s, y: 0 }))].sort((a, b) => a.s - b.s);

// W4 s17: the 12 digits in score order; the 5s are the positives. Scores are spaced 1 apart around 0.
export const SLIDE_DIGITS = [8, 7, 3, 9, 5, 2, 5, 5, 6, 5, 5, 5];
export const DATA_SLIDE = SLIDE_DIGITS.map((d, i) => ({ s: i - 5.5, y: d === 5 ? 1 : 0, d }));
// The slide's three arrows (left, middle, right) as thresholds on that scale.
export const SLIDE_ARROWS = [-2, 1, 3];

/** Predicted positive when score > threshold (as in the slide's `y_scores > threshold`). */
export function confusion(data, t) {
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let tp = 0;
  for (const { s, y } of data) {
    const pos = s > t;
    if (y) pos ? tp++ : fn++;
    else pos ? fp++ : tn++;
  }
  return { tn, fp, fn, tp };
}

const ratio = (a, b) => (b > 0 ? a / b : NaN);

/** All the usual metrics from the four counts. Undefined ratios (0/0) come back as NaN. */
export function metrics({ tn, fp, fn, tp }) {
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  // F1 = 2PR/(P+R) = TP / (TP + (FN + FP)/2); defined whenever there is any positive or predicted positive.
  const f1 = ratio(2 * tp, 2 * tp + fp + fn);
  const accuracy = ratio(tp + tn, tp + tn + fp + fn);
  const fpr = ratio(fp, fp + tn);
  return { precision, recall, tpr: recall, f1, accuracy, fpr };
}

/**
 * Sweep the threshold over every gap between sorted scores (from above the top score down to below the lowest).
 * Returns points with the counts and rates at each cut; the first point predicts nothing positive.
 */
export function sweep(data) {
  const sorted = [...data].sort((a, b) => b.s - a.s);
  const P = data.filter((d) => d.y).length;
  const N = data.length - P;
  const pts = [];
  let tp = 0;
  let fp = 0;
  pts.push({ t: sorted.length ? sorted[0].s + 0.5 : 0, tp, fp, fn: P, tn: N });
  sorted.forEach((d, i) => {
    if (d.y) tp++;
    else fp++;
    const next = sorted[i + 1];
    pts.push({ t: next ? (d.s + next.s) / 2 : d.s - 0.5, tp, fp, fn: P - tp, tn: N - fp });
  });
  return pts.map((p) => ({ ...p, tpr: ratio(p.tp, P), fpr: ratio(p.fp, N), precision: ratio(p.tp, p.tp + p.fp), recall: ratio(p.tp, P) }));
}

/** ROC AUC = probability a random positive scores above a random negative (ties count half). */
export function auc(data) {
  const pos = data.filter((d) => d.y);
  const neg = data.filter((d) => !d.y);
  if (!pos.length || !neg.length) return NaN;
  let s = 0;
  for (const p of pos) for (const n of neg) s += p.s > n.s ? 1 : p.s === n.s ? 0.5 : 0;
  return s / (pos.length * neg.length);
}

/** Trapezoid area under ROC points (for checking auc()). */
export function rocArea(points) {
  const pts = points.map((p) => [p.fpr, p.tpr]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let a = 0;
  for (let i = 1; i < pts.length; i++) a += ((pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1])) / 2;
  return a;
}
