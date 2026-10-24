// Word analogies by vector arithmetic in a toy 2-D embedding (W11 s5-8). Pure maths for EmbeddingAnalogy.jsx and tools/check-c.mjs.

/** Hand-placed 2-D "embedding": four groups, roughly parallel offsets (gender ≈ (1.0, −0.1)), slightly imperfect like real ones. */
export const WORDS = {
  nephew: [1.6, 3.0],
  niece: [2.62, 2.92],
  uncle: [1.92, 1.98],
  aunt: [2.9, 1.86],
  man: [1.35, -1.55],
  woman: [2.36, -1.66],
  king: [1.88, -2.88],
  queen: [2.86, -2.95],
  Athens: [-3.4, 1.4],
  Greece: [-2.62, 2.42],
  Oslo: [-2.42, 0.86],
  Norway: [-1.6, 1.9],
  walking: [-3.2, -1.15],
  walked: [-2.62, -2.2],
  swimming: [-1.85, -0.95],
  swam: [-1.22, -2.02],
};

export const GROUPS = [
  ['nephew', 'niece', 'uncle', 'aunt'],
  ['man', 'woman', 'king', 'queen'],
  ['Athens', 'Greece', 'Oslo', 'Norway'],
  ['walking', 'walked', 'swimming', 'swam'],
];

export const PRESETS = [
  { a: 'nephew', b: 'uncle', c: 'niece', want: 'aunt', rel: 'family relation' },
  { a: 'Athens', b: 'Greece', c: 'Oslo', want: 'Norway', rel: 'capital' },
  { a: 'walking', b: 'walked', c: 'swimming', want: 'swam', rel: 'past tense' },
  { a: 'man', b: 'woman', c: 'king', want: 'queen', rel: 'gender' },
];

export const cosine = (u, v) => (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1);
export const dist = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);

/** D ≈ C + (B − A). */
export function analogy(a, b, c, words = WORDS) {
  const [A, B, C] = [words[a], words[b], words[c]];
  return [C[0] + B[0] - A[0], C[1] + B[1] - A[1]];
}

/** Candidate words (excluding A, B, C) ranked by cosine similarity (default) or Euclidean distance to D. */
export function rank(D, exclude, by = 'cos', words = WORDS) {
  return Object.entries(words)
    .filter(([w]) => !exclude.includes(w))
    .map(([w, v]) => ({ w, cos: cosine(D, v), dist: dist(D, v) }))
    .sort((x, y) => (by === 'cos' ? y.cos - x.cos : x.dist - y.dist));
}
