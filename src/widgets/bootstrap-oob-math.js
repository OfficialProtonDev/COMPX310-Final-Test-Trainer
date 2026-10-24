// Bootstrap bags, pasting bags and out-of-bag fractions (W7 s9-14, FAQ1, FAQ4).
import { rng } from '../lib/svg.js';

/**
 * One bag of size k drawn from m training instances.
 * replace = true: bagging (bootstrap, duplicates possible); false: pasting (no duplicates, needs k <= m).
 * Returns counts[i] = how many times instance i is in the bag (0 = out-of-bag).
 */
export function drawBag(m, k, seed, replace = true) {
  const r = rng(seed);
  const counts = new Array(m).fill(0);
  if (replace) {
    for (let j = 0; j < k; j++) counts[r.int(m)]++;
  } else {
    // partial Fisher-Yates: the first k positions of a random permutation
    const idx = Array.from({ length: m }, (_, i) => i);
    for (let j = 0; j < Math.min(k, m); j++) {
      const t = j + r.int(m - j);
      [idx[j], idx[t]] = [idx[t], idx[j]];
      counts[idx[j]] = 1;
    }
  }
  return counts;
}

/** Histogram of a bag: hist[c] = number of instances drawn exactly c times. */
export function bagStats(counts) {
  const hist = [];
  for (const c of counts) hist[c] = (hist[c] || 0) + 1;
  for (let i = 0; i < hist.length; i++) hist[i] = hist[i] || 0;
  const m = counts.length;
  const missing = hist[0] || 0;
  const once = hist[1] || 0;
  const twice = hist[2] || 0;
  const more = m - missing - once - twice;
  return { hist, missing, once, twice, more, unique: m - missing, oobFrac: missing / m };
}

/** Expected out-of-bag fraction: bagging (1 - 1/m)^k, pasting 1 - k/m. */
export function expectedOob(m, k, replace = true) {
  return replace ? Math.pow(1 - 1 / m, k) : Math.max(0, 1 - k / m);
}

/** Seed for the first bag: with m = k = 100 it gives exactly the slide's FAQ4 histogram 36 / 37 / 20 / 5 / 2. */
export const SLIDE_SEED = 591; // found with findSlideSeed(); kept as a constant so the widget starts instantly

/** Seed of the i-th bag in a run (i = 0 is the slide bag); spreads seeds so streams don't overlap. */
export const bagSeed = (i, salt = 0) => (SLIDE_SEED + Math.imul(i, 0x9e3779b1) + salt * 7919) >>> 0;

/** Search seeds for a bag whose histogram equals target (used once, offline, to choose SLIDE_SEED). */
export function findSlideSeed(target = [36, 37, 20, 5, 2], m = 100, from = 1, to = 200000) {
  for (let s = from; s < to; s++) {
    const h = bagStats(drawBag(m, m, s, true)).hist;
    if (h.length === target.length && target.every((v, i) => h[i] === v)) return s;
  }
  return -1;
}
