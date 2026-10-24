// Checks for src/widgets/gp-math.js (bayes-slopes, gp-playground). Run: node tools/check-bayes-gp.mjs
import assert from 'node:assert/strict';
import { discretePosterior, blrPosterior, blrPredict, blrSamples, normCdf, gpPosterior, gpSamples, normals, cholesky } from '../src/widgets/gp-math.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);
let n = 0;
const ok = (m) => console.log('ok', ++n, m);

// 1. Slides W9b s14–15: intercept 18, reading 20 °C at x = 2, slopes 0/1/2, σ = 1, equal priors
{
  const { rows } = discretePosterior({ slopes: [0, 1, 2], priors: [1, 1, 1], sigma: 1 });
  assert.deepEqual(rows.map((r) => r.pred), [18, 20, 22]);
  assert.deepEqual(rows.map((r) => r.miss), [2, 0, -2]);
  assert.deepEqual(rows.map((r) => r.score.toFixed(3)), ['0.135', '1.000', '0.135']);
  assert.deepEqual(rows.map((r) => (100 * r.post).toFixed(1)), ['10.7', '78.7', '10.7']);
  near(rows[1].post, (1 / 3) / ((1 / 3) * (Math.exp(-2) + 1 + Math.exp(-2))), 1e-12, 'slide formula');
  ok('three slopes: scores 0.135 / 1 / 0.135 → posterior 10.7% / 78.7% / 10.7%');
  // more noise → flatter posterior; an unequal prior moves the posterior
  const wide = discretePosterior({ slopes: [0, 1, 2], priors: [1, 1, 1], sigma: 3 }).rows;
  assert.ok(wide[1].post < 0.4 && wide[0].post > 0.3, 'σ = 3 spreads belief');
  const skew = discretePosterior({ slopes: [0, 1, 2], priors: [8, 1, 1], sigma: 1 }).rows;
  assert.ok(skew[0].post > 0.45, 'strong prior on w = 0 survives one reading');
  ok(`σ = 3 → ${wide.map((r) => (100 * r.post).toFixed(1)).join(' / ')}%; prior 8:1:1 → ${skew.map((r) => (100 * r.post).toFixed(1)).join(' / ')}%`);
}

// 2. Bayesian linear regression on the thermometer log (W9b): x = 0,1,2,6,8 h after 08:00, y = 18,19.3,20,22,20
{
  const X = [0, 1, 2, 6, 8];
  const Y = [18, 19.3, 20, 22, 20];
  const alpha = 0.001; // the widget's prior: w ~ N(0, α⁻¹I), very weak (std ≈ 32)
  const beta = 1; // σ = 1 °C as on the slides
  const post = blrPosterior(X, Y, alpha, beta);
  // independent route: solve (αI + βΦᵀΦ) m = βΦᵀy by Cramer's rule; Σx = 17, Σx² = 105, Σy = 99.3, Σxy = 181.2
  const A = [[alpha + beta * 5, beta * 17], [beta * 17, alpha + beta * 105]];
  const r = [beta * 99.3, beta * (0 * 18 + 1 * 19.3 + 2 * 20 + 6 * 22 + 8 * 20)];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  near(post.m[0], (r[0] * A[1][1] - A[0][1] * r[1]) / det, 1e-9, 'm₀ closed form');
  near(post.m[1], (A[0][0] * r[1] - A[1][0] * r[0]) / det, 1e-9, 'm₁ closed form');
  const I = [[A[0][0] * post.S[0][0] + A[0][1] * post.S[1][0], A[0][0] * post.S[0][1] + A[0][1] * post.S[1][1]],
             [A[1][0] * post.S[0][0] + A[1][1] * post.S[1][0], A[1][0] * post.S[0][1] + A[1][1] * post.S[1][1]]];
  near(I[0][0], 1, 1e-12, 'A·S = I'); near(I[0][1], 0, 1e-12, 'A·S = I'); near(I[1][1], 1, 1e-12, 'A·S = I');
  // the weak prior pulls the intercept a hair toward 0, so the result is close to (not exactly) least squares
  near(post.m[1], 0.2898, 0.003, 'slope ≈ OLS 0.290');
  near(post.m[0], 18.875, 0.02, 'intercept ≈ OLS 18.875');
  // a 10× stronger prior (α = 0.01) shifts it visibly more
  const strong = blrPosterior(X, Y, 0.01, beta);
  assert.ok(Math.abs(strong.m[0] - 18.875) > 5 * Math.abs(post.m[0] - 18.875), 'shrinkage grows with α');
  const p4 = blrPredict(post, beta, 4);
  near(p4.mean, 20.03, 0.02, 'noon mean (all readings)');
  assert.ok(p4.std > 1 && p4.std < 1.2, `predictive std at noon ≈ √(1 + small): ${p4.std}`);
  const pAbove = 1 - normCdf((20 - p4.mean) / p4.std);
  near(pAbove, 0.51, 0.02, 'P(T ≥ 20) with all five readings');
  // the morning-only model predicts warmer, with more uncertainty, and uncertainty shrinks with data
  const stds = [1, 2, 3, 4, 5].map((k) => blrPredict(blrPosterior(X.slice(0, k), Y.slice(0, k), alpha, beta), beta, 4).std);
  for (let k = 1; k < 5; k++) assert.ok(stds[k] < stds[k - 1], `std at noon shrinks as readings arrive: ${stds.map((s) => s.toFixed(2))}`);
  const morning = blrPredict(blrPosterior(X.slice(0, 3), Y.slice(0, 3), alpha, beta), beta, 4);
  near(morning.mean, 22.1, 0.05, 'morning-only line 18.1 + 1.0x at x = 4');
  // uncertainty grows away from the data
  const far = blrPredict(post, beta, 12);
  assert.ok(far.std > p4.std, 'wider far from the data');
  // posterior samples average to the posterior mean
  const zs = Array.from({ length: 4000 }, (_, i) => { const u = (i + 0.5) / 4000; return [Math.cos(2 * Math.PI * u * 37) * 1.2, Math.sin(2 * Math.PI * u * 53) * 1.2]; });
  const ws = blrSamples(post, zs);
  near(ws.reduce((s, w) => s + w[1], 0) / ws.length, post.m[1], 0.01, 'sample mean slope');
  ok(`thermometer: mean line ${post.m[0].toFixed(2)} + ${post.m[1].toFixed(3)}x; noon ${p4.mean.toFixed(2)} ± ${(2 * p4.std).toFixed(2)} (P ≥ 20 °C = ${(100 * pAbove).toFixed(0)}%); noon std for k = 1..5: ${stds.map((s) => s.toFixed(2)).join(', ')}`);
}

// 3. normal CDF
{
  near(normCdf(0), 0.5, 1e-9, 'Φ(0)');
  near(normCdf(1.959964), 0.975, 1e-6, 'Φ(1.96)');
  near(normCdf(-2), 0.02275, 1e-5, 'Φ(−2)');
  ok('normal CDF');
}

// 4. GP regression on the fish example (W9a): (10 °C, 12), (15 °C, 22), (20 °C, 16); prior mean 16, σf = 5, l = 5
{
  const X = [10, 15, 20];
  const Y = [12, 22, 16];
  const xs = Array.from({ length: 101 }, (_, i) => 5 + (25 * i) / 100); // 5 … 30 step 0.25
  const idx = (x) => Math.round((x - 5) / 0.25);
  const small = gpPosterior({ X, y: Y, xs, l: 5, sf: 5, sn: 0.05, mean0: 16 });
  X.forEach((x, i) => near(small.mean[idx(x)], Y[i], 0.05, `mean passes through (${x}, ${Y[i]}) when σn is small`));
  X.forEach((x) => assert.ok(small.std[idx(x)] < 2 * 0.05 && small.std[idx(x)] >= 0.05, `std at an observation ≈ σn: ${small.std[idx(x)]}`));
  assert.ok(small.std[idx(30)] > 4.5, `std far away → σf: ${small.std[idx(30)]}`);
  assert.ok(small.std[idx(17)] > small.std[idx(15)], 'std between observations > at them');
  const far = gpPosterior({ X, y: Y, xs: [60], l: 5, sf: 5, sn: 0.05, mean0: 16 });
  near(far.mean[0], 16, 1e-6, 'far from the data the mean returns to the prior mean');
  near(far.std[0], Math.sqrt(25 + 0.0025), 1e-6, 'and the std returns to the prior std');
  // noisier observations: mean no longer interpolates, std at data ≥ σn
  const noisy = gpPosterior({ X, y: Y, xs, l: 5, sf: 5, sn: 3, mean0: 16 });
  assert.ok(Math.abs(noisy.mean[idx(15)] - 22) > 1, 'large σn: mean does not pass through the point');
  assert.ok(noisy.std[idx(15)] >= 3, 'large σn: std at an observation ≥ σn');
  // length scale: long l → smooth (small curvature), short l → reverts to the prior between points
  const shortL = gpPosterior({ X, y: Y, xs, l: 1, sf: 5, sn: 0.05, mean0: 16 });
  near(shortL.mean[idx(12.5)], 16, 0.5, 'short l: back to the prior mean halfway between points');
  const q = small.mean[idx(17)];
  ok(`fish GP (σn = 0.05): mean at data ${X.map((x) => small.mean[idx(x)].toFixed(2)).join(', ')}; std at data ${X.map((x) => small.std[idx(x)].toFixed(3)).join(', ')}; at 17 °C ${q.toFixed(2)} ± ${(2 * small.std[idx(17)]).toFixed(2)}; at 30 °C std ${small.std[idx(30)].toFixed(2)}`);
}

// 5. Prior and posterior samples: Cholesky with jitter works even for very smooth kernels; sample spread matches std
{
  const xs = Array.from({ length: 121 }, (_, i) => 5 + (25 * i) / 120);
  for (const l of [0.5, 5, 20]) {
    const prior = gpPosterior({ X: [], y: [], xs, l, sf: 5, sn: 0.5, mean0: 16 });
    const zs = normals(400, xs.length, 3);
    const fs = gpSamples(prior.mean, prior.cov, zs, 25);
    assert.equal(fs.length, 400, `prior samples drawn for l = ${l}`);
    const j = 60;
    const m = fs.reduce((s, f) => s + f[j], 0) / fs.length;
    const sd = Math.sqrt(fs.reduce((s, f) => s + (f[j] - m) ** 2, 0) / fs.length);
    near(sd, 5, 0.6, `prior sample std ≈ σf (l = ${l})`);
    const post = gpPosterior({ X: [10, 15, 20], y: [12, 22, 16], xs, l, sf: 5, sn: 0.5, mean0: 16 });
    const ps = gpSamples(post.mean, post.cov, zs.slice(0, 5), 25);
    assert.equal(ps.length, 5, `posterior samples drawn for l = ${l}`);
  }
  assert.equal(cholesky([[1, 1], [1, 1]], 0).jitter > 0, true, 'singular matrix gets jitter');
  ok('sampling: prior sample std ≈ σf for l = 0.5, 5, 20; posterior samples drawn with jitter');
}
console.log('all bayes/gp checks passed');
