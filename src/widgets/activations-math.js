// Activation functions and their derivatives (W6a s7, W6b vanishing gradients). Pure functions.

const sig = (z) => 1 / (1 + Math.exp(-z));

export const ACTS = {
  step: { label: 'Step', f: (z) => (z >= 0 ? 1 : 0), d: (z) => (z === 0 ? NaN : 0) },
  sigmoid: { label: 'Sigmoid', f: sig, d: (z) => sig(z) * (1 - sig(z)) },
  tanh: { label: 'Tanh', f: Math.tanh, d: (z) => 1 - Math.tanh(z) ** 2 },
  relu: { label: 'ReLU', f: (z) => Math.max(0, z), d: (z) => (z > 0 ? 1 : z < 0 ? 0 : NaN) },
};

export const SAT = 0.05; // |slope| below this counts as saturated

/** z-intervals inside [lo, hi] where |f′(z)| < SAT (sampled every `h`). */
export function saturatedIntervals(key, lo = -5, hi = 5, h = 0.005) {
  const d = ACTS[key].d;
  const out = [];
  let start = null;
  for (let z = lo; z <= hi + 1e-9; z += h) {
    const v = d(z);
    const sat = Number.isFinite(v) ? Math.abs(v) < SAT : start !== null; // a kink/jump point keeps the current state
    if (sat && start === null) start = z;
    if (!sat && start !== null) {
      out.push([start, z - h]);
      start = null;
    }
  }
  if (start !== null) out.push([start, hi]);
  return out;
}

/** Where sigmoid and tanh start to saturate (|z| beyond this): exact inverses of the slope formulas. */
export const SIGMOID_SAT_Z = Math.log((1 + Math.sqrt(1 - 4 * SAT)) / (1 - Math.sqrt(1 - 4 * SAT))); // σ(1−σ) = 0.05
export const TANH_SAT_Z = Math.atanh(Math.sqrt(1 - SAT)); // 1 − tanh² = 0.05
