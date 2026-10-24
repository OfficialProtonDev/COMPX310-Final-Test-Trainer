// k-nearest neighbours on the W2 s6 toy example (Lindholm et al. fig 2.3). Pure functions, no DOM.

export const POINTS = [
  { i: 1, x1: -1, x2: 3, c: 'Red' },
  { i: 2, x1: 2, x2: 1, c: 'Blue' },
  { i: 3, x1: -2, x2: 2, c: 'Red' },
  { i: 4, x1: -1, x2: 2, c: 'Blue' },
  { i: 5, x1: -1, x2: 0, c: 'Blue' },
  { i: 6, x1: 1, x2: 1, c: 'Red' },
];
export const QUERY = { x1: 1, x2: 2 };

/**
 * Rank the training points by Euclidean distance to q. s1 multiplies feature x1 before measuring
 * (s1 = 100 mimics an unscaled feature measured in much bigger units). Equal distances keep index order.
 */
export function rankNeighbours(q, s1 = 1, points = POINTS) {
  return points
    .map((p) => {
      const d1 = (p.x1 - q.x1) * s1;
      const d2 = p.x2 - q.x2;
      const sq = d1 * d1 + d2 * d2;
      return { ...p, d1, d2, sq, d: Math.sqrt(sq) };
    })
    .sort((a, b) => a.sq - b.sq || a.i - b.i)
    .map((r, j) => ({ ...r, rank: j + 1 }));
}

/** Majority vote among the k nearest. vote is 'Red', 'Blue' or 'tie'. radius = distance to the k-th neighbour. */
export function knn(q, k, s1 = 1, points = POINTS) {
  const rows = rankNeighbours(q, s1, points);
  const kk = Math.max(1, Math.min(k, rows.length));
  const near = rows.slice(0, kk);
  const red = near.filter((r) => r.c === 'Red').length;
  const blue = kk - red;
  const vote = red > blue ? 'Red' : blue > red ? 'Blue' : 'tie';
  return { rows, near, red, blue, vote, radius: rows[kk - 1].d };
}

/** "√5 ≈ 2.24" when the squared distance is a whole number, else just the decimal. */
export function distLabel(sq, dp = 2) {
  const d = Math.sqrt(sq);
  const n = Math.round(sq);
  const whole = Math.abs(sq - n) < 1e-9;
  const dec = d.toFixed(dp).replace(/\.?0+$/, '');
  if (!whole) return dec;
  if (Number.isInteger(d)) return `√${n} = ${d}`;
  return `√${n} ≈ ${dec}`;
}

/** Fast vote at one location (no allocations beyond two tiny arrays): used for the shaded decision regions. */
export function voteAt(x1, x2, k, s1 = 1, points = POINTS) {
  const n = points.length;
  const d = new Array(n);
  const idx = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = (points[i].x1 - x1) * s1;
    const b = points[i].x2 - x2;
    d[i] = a * a + b * b;
    idx[i] = i;
  }
  // insertion sort by distance, ties by index (same order as rankNeighbours)
  for (let i = 1; i < n; i++) {
    const j0 = idx[i];
    let j = i - 1;
    while (j >= 0 && (d[idx[j]] > d[j0] || (d[idx[j]] === d[j0] && idx[j] > j0))) {
      idx[j + 1] = idx[j];
      j--;
    }
    idx[j + 1] = j0;
  }
  let red = 0;
  const kk = Math.min(k, n);
  for (let i = 0; i < kk; i++) if (points[idx[i]].c === 'Red') red++;
  return red * 2 > kk ? 'Red' : red * 2 < kk ? 'Blue' : 'tie';
}
