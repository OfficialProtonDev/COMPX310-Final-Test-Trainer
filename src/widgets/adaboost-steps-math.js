// AdaBoost reweighting, round by round (W7 s26-32; worked example adapted from sefiks.com).
// Pure functions so tools/check-adaboost-steps.mjs can assert the slide numbers.

/** The lecture's 10 instances: actual classes and each round's predictions (s30-32). */
export const ACTUAL = [1, 1, 1, 0, 0, 1, 0, 1, 0, 0];
export const LECTURE_PREDS = [
  [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
];

/** alpha = eta * ln((1 - r) / r); +inf at r = 0, -inf at r = 1. */
export function alphaOf(r, eta = 1) {
  if (r <= 0) return Infinity;
  if (r >= 1) return -Infinity;
  return eta * Math.log((1 - r) / r);
}

/**
 * Run AdaBoost on fixed per-round predictions.
 * Each round j: wrong[i] = preds[j][i] != actual[i]; r = sum(wrong w) / sum(w); alpha = eta ln((1-r)/r);
 * misclassified weights are multiplied by e^alpha; then all weights are divided by their sum.
 * A perfect (r = 0) or perfectly wrong (r = 1) learner gets an infinite alpha and leaves the weights unchanged
 * (sklearn stops boosting at that point).
 */
export function runAdaBoost(actual, preds, eta = 1, w0) {
  const m = actual.length;
  let w = w0 ? w0.slice() : new Array(m).fill(1 / m);
  const rounds = [];
  for (const pred of preds) {
    const wrong = pred.map((p, i) => p !== actual[i]);
    const total = w.reduce((s, v) => s + v, 0);
    const wrongSum = w.reduce((s, v, i) => s + (wrong[i] ? v : 0), 0);
    const r = wrongSum / total;
    const alpha = alphaOf(r, eta);
    const factor = Number.isFinite(alpha) ? Math.exp(alpha) : NaN;
    const degenerate = !Number.isFinite(alpha);
    const updated = degenerate ? w.slice() : w.map((v, i) => (wrong[i] ? v * factor : v));
    const sumUpdated = updated.reduce((s, v) => s + v, 0);
    const normalised = updated.map((v) => v / sumUpdated);
    rounds.push({ pred, wrong, before: w, total, wrongSum, r, alpha, factor, degenerate, updated, sumUpdated, normalised });
    w = normalised;
  }
  return rounds;
}

/** Weighted vote after the given rounds: score[k] = sum of alpha_j over rounds predicting class k. */
export function weightedVote(rounds, i, classes = [0, 1]) {
  const score = Object.fromEntries(classes.map((k) => [k, 0]));
  const parts = Object.fromEntries(classes.map((k) => [k, []]));
  rounds.forEach((rd, j) => {
    const k = rd.pred[i];
    score[k] += rd.alpha;
    parts[k].push(j);
  });
  let best = classes[0];
  for (const k of classes) if (score[k] > score[best]) best = k;
  const tie = classes.filter((k) => score[k] === score[best]).length > 1;
  return { score, parts, pred: best, tie };
}
