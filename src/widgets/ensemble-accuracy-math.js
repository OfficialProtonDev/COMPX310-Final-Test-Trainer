// Majority-vote accuracy of n voters that are each right with probability p (W7 s4-6, FAQ2).
// Pure functions so tools/check-ensemble-accuracy.mjs can assert the slide numbers.

const LOGF = [0];
/** ln(k!) from a cached table (exact sums of logs; fine for k up to a few thousand). */
export function logFact(k) {
  for (let i = LOGF.length; i <= k; i++) LOGF[i] = LOGF[i - 1] + Math.log(i);
  return LOGF[k];
}

/** P(X = k) for X ~ Binomial(n, p), computed in log space so n = 1001 does not underflow. */
export function binomPmf(n, k, p) {
  if (k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logFact(n) - logFact(k) - logFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** P(X >= k). */
export function binomAtLeast(n, k, p) {
  let s = 0;
  for (let j = Math.max(0, k); j <= n; j++) s += binomPmf(n, j, p);
  return Math.min(1, s);
}

/**
 * Probability that a strict majority of n independent voters is correct (two classes).
 * For odd n a tie is impossible; for even n a tie counts as wrong.
 */
export function majorityAcc(n, p) {
  return binomAtLeast(n, Math.floor(n / 2) + 1, p);
}

/**
 * Simple correlation model: with probability rho every voter copies one shared vote
 * (so the ensemble is right with probability p), otherwise they vote independently.
 */
export function mixtureAcc(n, p, rho) {
  return rho * p + (1 - rho) * majorityAcc(n, p);
}

/** The 8 cases of FAQ2 for three voters: pattern like 'ccw', probability, majority correct? */
export function cases3(p) {
  const out = [];
  for (const a of 'cw') for (const b of 'cw') for (const c of 'cw') {
    const pat = a + b + c;
    const nc = [...pat].filter((x) => x === 'c').length;
    const prob = [...pat].reduce((s, x) => s * (x === 'c' ? p : 1 - p), 1);
    out.push({ pat, prob, correct: nc >= 2 });
  }
  return out;
}

/** Odd ensemble sizes on a roughly logarithmic ladder (slider positions). */
export const N_STEPS = [1, 3, 5, 7, 9, 11, 15, 21, 31, 41, 51, 75, 101, 151, 201, 301, 501, 751, 1001];

/** Odd n used to draw the curve: every odd n up to 51, then about 70 more spaced evenly on a log axis up to 1001. */
export const N_CURVE = (() => {
  const s = new Set();
  for (let n = 1; n <= 51; n += 2) s.add(n);
  for (let i = 0; i <= 70; i++) {
    let n = Math.round(Math.exp(Math.log(51) + ((Math.log(1001) - Math.log(51)) * i) / 70));
    if (n % 2 === 0) n += 1;
    s.add(Math.min(1001, n));
  }
  N_STEPS.forEach((n) => s.add(n));
  return [...s].sort((a, b) => a - b);
})();

/** Majority accuracy of independent voters along N_CURVE: [[n, acc], ...]. */
export function oddCurve(p) {
  return N_CURVE.map((n) => [n, majorityAcc(n, p)]);
}
