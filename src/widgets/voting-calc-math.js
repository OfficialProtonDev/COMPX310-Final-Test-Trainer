// Hard vs soft voting (W7 s6-8, FAQ3). Pure functions for the widget and tools/check-voting-calc.mjs.

/** Index of the largest value; ties go to the first (like np.argmax). */
export const argmax = (a) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
export const rowSum = (r) => r.reduce((s, v) => s + v, 0);
/** Rescale a row so it sums to 1 (all-zero rows become uniform). */
export const normRow = (r) => {
  const s = rowSum(r);
  return s > 0 ? r.map((v) => v / s) : r.map(() => 1 / r.length);
};

/** Hard voting: every model votes for its argmax class; the class with the most votes wins. */
export function hardVote(probs) {
  const K = probs[0].length;
  const votes = probs.map(argmax);
  const counts = new Array(K).fill(0);
  votes.forEach((v) => counts[v]++);
  const winner = argmax(counts);
  const tied = counts.map((_, k) => k).filter((k) => counts[k] === counts[winner]);
  return { votes, counts, winner, tie: tied.length > 1, tied };
}

/** Soft voting: average the (normalised) probability rows, then take the argmax. */
export function softVote(probs) {
  const K = probs[0].length;
  const rows = probs.map(normRow);
  const sums = new Array(K).fill(0);
  rows.forEach((r) => r.forEach((v, k) => (sums[k] += v)));
  const avg = sums.map((s) => s / probs.length);
  const winner = argmax(avg);
  const tied = avg.map((_, k) => k).filter((k) => Math.abs(avg[k] - avg[winner]) < 1e-9);
  return { rows, sums, avg, winner, tie: tied.length > 1, tied };
}

/** Hard voting when models only report a label: count labels; the most frequent wins (first listed on ties). */
export function countLabels(labels, names) {
  const counts = names.map((n) => labels.filter((l) => l === n).length);
  const winner = argmax(counts);
  const tied = counts.map((_, k) => k).filter((k) => counts[k] === counts[winner]);
  return { counts, winner, tie: tied.length > 1, tied };
}
