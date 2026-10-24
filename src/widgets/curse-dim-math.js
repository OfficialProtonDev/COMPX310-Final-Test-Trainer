// Curse of dimensionality (W10a s5-6): pure maths, shared by CurseDim.jsx and tools/check-c.mjs.
import { rng } from '../lib/svg.js';

/** Chance a uniform point in the unit hypercube lies within eps of some border: 1 − (1 − 2·eps)^d. */
export const nearBorder = (d, eps = 0.001) => 1 - Math.pow(1 - 2 * eps, d);

/** log10 of the chance of NOT being near a border (works when the chance underflows to 0). */
export const log10NotNear = (d, eps = 0.001) => d * Math.log10(1 - 2 * eps);

// Exact mean distance between two uniform random points: d = 1 (1/3), unit square, unit cube (Robbins constant).
const SQ2 = Math.SQRT2;
export const EXACT_MEAN = {
  1: 1 / 3,
  2: (2 + SQ2 + 5 * Math.log(1 + SQ2)) / 15,
  3: (4 + 17 * SQ2 - 6 * Math.sqrt(3) + 21 * Math.log(1 + SQ2) + 42 * Math.log(2 + Math.sqrt(3)) - 7 * Math.PI) / 105,
};

/** Monte-Carlo estimate (fixed seed) of mean and sd of the distance between two random points in [0,1]^d. */
export function mcDistance(d, pairs = 3000, seed = 310) {
  const r = rng(seed + d);
  let s = 0;
  let s2 = 0;
  for (let p = 0; p < pairs; p++) {
    let q = 0;
    for (let i = 0; i < d; i++) {
      const t = r() - r();
      q += t * t;
    }
    const dist = Math.sqrt(q);
    s += dist;
    s2 += dist * dist;
  }
  const mean = s / pairs;
  return { mean, sd: Math.sqrt(Math.max(0, s2 / pairs - mean * mean)) };
}

/**
 * Mean distance and sd for any d. Exact for d ≤ 3, Monte-Carlo for d ≤ 100,
 * large-d approximation √(d/6)·(1 − 0.175/d) beyond (E[D²] = d/6; sd → √(7/120) ≈ 0.24).
 */
export function avgDistance(d) {
  if (d <= 3) {
    const mean = EXACT_MEAN[d];
    return { mean, sd: Math.sqrt(d / 6 - mean * mean), method: 'exact' };
  }
  if (d <= 100) return { ...mcDistance(d), method: 'mc' };
  return { mean: Math.sqrt(d / 6) * (1 - 0.175 / d), sd: Math.sqrt(7 / 120), method: 'approx' };
}
