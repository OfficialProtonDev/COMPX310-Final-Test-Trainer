// Scaled dot-product attention (W11 s14-17, s23-28). Pure maths for AttentionCalc.jsx and tools/check-c.mjs.

export const dot = (a, b) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

/** Softmax that treats −∞ as weight 0 (masked positions). */
export function softmax(xs) {
  const m = Math.max(...xs.filter((x) => x !== -Infinity));
  const ex = xs.map((x) => (x === -Infinity ? 0 : Math.exp(x - m)));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / s);
}

/** For one query: q·k for each key, ÷ √d_k, softmax → weights (the share of each value in the output). */
export function attend(q, keys, dk) {
  const dots = keys.map((k) => dot(q, k));
  const scaled = dots.map((d) => d / Math.sqrt(dk));
  return { dots, scaled, weights: softmax(scaled) };
}

/** Output vector = Σ weight_j · value_j. */
export const mix = (weights, values) => values[0].map((_, c) => weights.reduce((s, w, j) => s + w * values[j][c], 0));

/** The lecture's drinks example (W11 s15-17). */
export const DRINKS = {
  queries: [
    { name: 'Alice', v: [0.8, 0.2] },
    { name: 'Bob', v: [0.4, 0.6] },
  ],
  keys: [
    { name: 'apple', v: [0.9, 0.1] },
    { name: 'lemon', v: [0.2, 0.8] },
  ],
  extra: { name: 'orange', v: [0.6, 0.5] },
  dk: 2,
};

/** Masked self-attention demo: scaled scores q_i·k_j/√d_k for "I ate an apple today" (made-up numbers). */
export const SENT = ['I', 'ate', 'an', 'apple', 'today'];
export const SENT_SCORES = [
  [2.0, 0.6, 0.1, 0.4, 0.3],
  [1.2, 1.5, 0.2, 1.8, 0.5],
  [0.1, 0.4, 0.8, 1.6, 0.2],
  [0.3, 1.7, 0.9, 1.4, 0.4],
  [0.5, 1.1, 0.1, 0.6, 1.3],
];

/** Row-wise softmax with an optional causal mask (key j > query i set to −∞ before the softmax). */
export function selfAttention(scores, causal) {
  return scores.map((row, i) => softmax(row.map((s, j) => (causal && j > i ? -Infinity : s))));
}
