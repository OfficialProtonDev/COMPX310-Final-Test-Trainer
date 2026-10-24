// Checks for team d's widget maths (weeks 2-6). Run: node tools/check-d.mjs
import { POINTS, QUERY, knn, voteAt, rankNeighbours, distLabel } from '../src/widgets/knn-demo-math.js';
import { gini, entropy, misclass, evalSplit, IRIS } from '../src/widgets/gini-calc-math.js';
import { buildModel, kerasCode, lossFor, LECTURE } from '../src/widgets/dense-params-math.js';
import { DATA24, DATA_SLIDE, SLIDE_ARROWS, confusion, metrics, sweep, auc, rocArea } from '../src/widgets/metrics-threshold-math.js';
import * as GD from '../src/widgets/gd-learning-rate-math.js';
import { makePolyData, polyFit, polyEval, errorCurve, shots, level } from '../src/widgets/bias-variance-math.js';
import { ACTS, saturatedIntervals, SIGMOID_SAT_Z, TANH_SAT_Z } from '../src/widgets/activations-math.js';

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL', msg);
  }
};
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b} ± ${tol}`);
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// ---------------------------------------------------------------- kNN (W2 s6)
{
  const rows = rankNeighbours(QUERY);
  eq(rows.map((r) => r.i), [6, 2, 4, 1, 5, 3], 'kNN order by distance from (1, 2)');
  eq(rows.map((r) => r.sq), [1, 2, 4, 5, 8, 9], 'kNN squared distances √1 √2 √4 √5 √8 √9');
  eq(rows.map((r) => +r.d.toFixed(2)), [1, 1.41, 2, 2.24, 2.83, 3], 'kNN distances to 2 dp');
  eq(rows.map((r) => distLabel(r.sq)), ['√1 = 1', '√2 ≈ 1.41', '√4 = 2', '√5 ≈ 2.24', '√8 ≈ 2.83', '√9 = 3'], 'kNN distance labels');
  eq(knn(QUERY, 1).vote, 'Red', 'kNN k=1 → Red');
  eq(knn(QUERY, 3).vote, 'Blue', 'kNN k=3 → Blue');
  eq([knn(QUERY, 3).red, knn(QUERY, 3).blue], [1, 2], 'kNN k=3 votes 1 Red, 2 Blue');
  eq([2, 4, 6].map((k) => knn(QUERY, k).vote), ['tie', 'tie', 'tie'], 'kNN even k ties on the slide example');
  near(knn(QUERY, 3).radius, 2, 1e-12, 'kNN k=3 circle radius = distance to i4');
  const q = { x1: -0.5, x2: 2 };
  eq([knn(q, 3, 1).vote, knn(q, 3, 100).vote], ['Red', 'Blue'], 'kNN scaling preset flips the vote');
  eq(POINTS.length, 6, 'six training points');
  // the fast region vote agrees with the full ranking everywhere on the grid
  let agree = true;
  for (let a = -3; a <= 3; a += 0.25) for (let b = -1; b <= 4; b += 0.25) for (const k of [1, 2, 3, 4, 5, 6]) for (const s1 of [1, 100]) if (voteAt(a, b, k, s1) !== knn({ x1: a, x2: b }, k, s1).vote) agree = false;
  ok(agree, 'region vote (voteAt) matches knn() on a grid');
}

// ---------------------------------------------------------------- impurity (W2 s15, s18)
{
  const g3 = (c) => +gini(c).toFixed(3);
  eq(g3(IRIS.root.counts), 0.665, 'Gini root [37, 34, 41]');
  eq(g3(IRIS.right.counts), 0.496, 'Gini right child [0, 34, 41]');
  eq(g3(IRIS.leaf1.counts), 0.153, 'Gini leaf [0, 33, 3]');
  eq(+gini(IRIS.leaf2.counts).toFixed(2), 0.05, 'Gini leaf [0, 1, 38] (0.0500 to 2 dp)');
  eq(gini(IRIS.leftLeaf.counts), 0, 'Gini pure leaf [37, 0, 0]');
  for (const r of [0.1, 0.3, 0.5, 0.83]) near(gini([r, 1 - r]), 2 * r * (1 - r), 1e-12, `Gini 2r(1−r) at r=${r}`);
  near(entropy([5, 5], 2), 1, 1e-12, 'entropy 50/50 = 1 bit');
  near(entropy([5, 5], Math.E), Math.LN2, 1e-12, 'entropy 50/50 = ln 2 nats (slide form)');
  near(entropy([3, 7], Math.E), -0.3 * Math.log(0.3) - 0.7 * Math.log(0.7), 1e-12, 'entropy −r ln r − (1−r) ln(1−r)');
  near(misclass([3, 7]), 0.3, 1e-12, 'misclassification 1 − max(r, 1 − r)');
  const sp = evalSplit(IRIS.leftLeaf.counts, IRIS.right.counts);
  eq(sp.parent, IRIS.root.counts, 'split parent = left + right');
  near(sp.gini.weighted, (75 / 112) * gini(IRIS.right.counts), 1e-12, 'weighted Gini of the root split');
  eq(+sp.gini.weighted.toFixed(3), 0.332, 'weighted Gini 0.332');
  eq(+sp.gini.decrease.toFixed(3), 0.333, 'Gini decrease 0.333');
  const worse = evalSplit([9, 0], [1, 2]);
  ok(worse.gini.right > worse.gini.parent && worse.gini.weighted < worse.gini.parent, 'child can be less pure than parent while the weighted impurity drops');
  // concavity: the weighted children never exceed the parent (random splits)
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let worst = -1;
  for (let i = 0; i < 2000; i++) {
    const L = [0, 0, 0].map(() => Math.floor(rnd() * 20));
    const R = [0, 0, 0].map(() => Math.floor(rnd() * 20));
    if (L.every((v) => !v) || R.every((v) => !v)) continue;
    const e = evalSplit(L, R);
    worst = Math.max(worst, e.gini.weighted - e.gini.parent, e.entropy.weighted - e.entropy.parent, e.misclass.weighted - e.misclass.parent);
  }
  ok(worst <= 1e-12, `weighted child impurity never above the parent (max excess ${worst})`);
}

// ---------------------------------------------------------------- Keras params (W6a s14-15, s23)
{
  const m = buildModel(LECTURE);
  eq(m.layers.map((l) => l.params), [0, 235500, 30100, 1010], 'lecture model params per layer');
  eq(m.layers.map((l) => l.out), [784, 300, 100, 10], 'lecture model output shapes');
  eq(m.layers.map((l) => l.name), ['flatten', 'dense', 'dense_1', 'dense_2'], 'Keras layer names');
  eq(m.total, 266610, 'lecture model total 266,610');
  near((m.total * 4) / 1024 ** 2, 1.02, 0.005, 'lecture model ≈ 1.02 MB of float32 weights');
  const reg = buildModel({ input: { kind: 'vector', dims: [8] }, hidden: [{ units: 30, act: 'relu' }], task: 'regression', nOut: 1 });
  eq(reg.total, 8 * 30 + 30 + 30 + 1, 'regression net 8 → 30 → 1');
  eq(buildModel({ ...LECTURE, task: 'binary', nOut: 7 }).layers.at(-1).out, 1, 'binary output has 1 unit');
  eq(buildModel({ ...LECTURE, task: 'multilabel', nOut: 3 }).layers.at(-1).act, 'sigmoid', 'multilabel output is sigmoid');
  eq(buildModel({ ...LECTURE, input: { kind: 'image', dims: [32, 32, 3] } }).layers[0].out, 3072, 'Flatten 32×32×3 = 3072');
  eq(
    ['binary', 'multilabel', 'regression'].map((t) => lossFor(t)).concat([lossFor('multiclass', false), lossFor('multiclass', true)]),
    ['binary_crossentropy', 'binary_crossentropy', 'mean_squared_error', 'sparse_categorical_crossentropy', 'categorical_crossentropy'],
    'loss per task'
  );
  const code = kerasCode(LECTURE);
  ok(code.includes('keras.layers.Flatten(input_shape=[28, 28])') && code.includes('Dense(10, activation="softmax")') && code.includes('loss="sparse_categorical_crossentropy"') && code.includes('epochs=30'), 'Keras code for the lecture model');
}

// ---------------------------------------------------------------- metrics (W4; 2024 test Q10)
{
  const q10 = metrics({ tn: 1400, fp: 600, fn: 200, tp: 600 });
  near(q10.recall, 0.75, 1e-12, '2024 Q10 recall 600/800');
  near(q10.precision, 0.5, 1e-12, '2024 Q10 precision 600/1200');
  near(q10.f1, 0.6, 1e-12, '2024 Q10 F1');
  near(q10.f1, (2 * q10.precision * q10.recall) / (q10.precision + q10.recall), 1e-12, 'F1 = 2PR/(P+R)');
  const s13 = metrics({ tn: 5, fp: 1, fn: 2, tp: 3 });
  eq([+s13.precision.toFixed(4), +s13.recall.toFixed(4), +s13.f1.toFixed(4)], [0.75, 0.6, 0.6667], 'slide s13 [[5,1],[2,3]]');
  const mn = metrics({ tn: 52992, fp: 1587, fn: 1074, tp: 4347 });
  eq([+mn.precision.toFixed(4), +mn.recall.toFixed(4), +mn.f1.toFixed(4)], [0.7326, 0.8019, 0.7657], 'MNIST 5-detector P/R/F1 from W4');
  eq(confusion(DATA24, 0), { tn: 10, fp: 4, fn: 2, tp: 8 }, '24 scores at threshold 0');
  eq(DATA24.length, 24, '24 instances');
  const slide = SLIDE_ARROWS.map((t) => confusion(DATA_SLIDE, t)).map((c) => [c.tp, c.tp + c.fp, c.tp + c.fn]);
  eq(slide, [[6, 8, 6], [4, 5, 6], [3, 3, 6]], 'slide s17 arrows: 6/8 & 6/6, 4/5 & 4/6, 3/3 & 3/6');
  // raising the threshold never raises recall
  let mono = true;
  let prev = 2;
  for (let t = -5; t <= 5; t += 0.1) {
    const r = metrics(confusion(DATA24, t)).recall;
    if (r > prev + 1e-12) mono = false;
    prev = r;
  }
  ok(mono, 'recall never rises as the threshold rises');
  near(metrics(confusion(DATA24, 2)).precision, 0.8, 1e-12, 'precision 0.8 at t = 2');
  near(metrics(confusion(DATA24, 2.5)).precision, 0.75, 1e-12, 'precision dips to 0.75 at t = 2.5');
  near(auc(DATA24), 119 / 140, 1e-12, 'AUC of the 24 scores = 119/140');
  near(rocArea(sweep(DATA24)), auc(DATA24), 1e-12, 'trapezoid ROC area = pairwise AUC');
  near(auc(DATA_SLIDE), 32 / 36, 1e-12, 'AUC of the slide digits');
  ok(Number.isNaN(metrics({ tn: 5, fp: 0, fn: 3, tp: 0 }).precision), 'precision undefined with no predicted positives');
}

// ---------------------------------------------------------------- gradient descent (W5)
{
  const st = (e) => GD.status1d(e).key;
  eq([0.01, 0.02, 0.05].map(st), ['slow', 'slow', 'slow'], 'small η is slow');
  eq([0.1, 0.2, 0.3, 0.4, 0.5].map(st), ['converges', 'converges', 'converges', 'converges', 'converges'], 'η 0.1–0.5 converges');
  eq([0.6, 0.7, 0.8, 0.9, 0.95].map(st), ['oscillates', 'oscillates', 'oscillates', 'oscillates', 'oscillates'], 'η 0.6–0.95 overshoots but converges');
  eq(st(1), 'bounces', 'η = 1 neither converges nor diverges');
  eq([1.05, 1.1].map(st), ['diverges', 'diverges'], 'η > 1 diverges');
  const t1 = GD.gd1d(1);
  ok(t1.every((t, i) => t === (i % 2 ? 8 : -2)), 'η = 1 bounces −2, 8, −2, … for 20 steps');
  const td = GD.gd1d(1.05);
  ok(Math.abs(td[20] - 3) > 5 * 1.09 ** 20 * 0.99 && Math.abs(td[20] - 3) > Math.abs(td[19] - 3), 'η = 1.05: distance grows by |1 − 2η| = 1.1 per step');
  near(Math.abs(GD.gd1d(1.1)[20] - 3), 5 * 1.2 ** 20, 1e-6, 'η = 1.1: |θ₂₀ − 3| = 5·1.2²⁰');
  near(GD.gd1d(0.5)[1], 3, 1e-12, 'η = 0.5 lands on the minimum in one step');
  near(GD.gd1d(0.1)[1], -1, 1e-12, 'θ₁ = −2 − 0.1·(−10) = −1');
  ok(GD.ETAS[0] === 0.01 && GD.ETAS.at(-1) === 1.1, 'η slider covers 0.01–1.1');

  const data = GD.makeData2d();
  const Xs = GD.design(data, true);
  const Xu = GD.design(data, false);
  const fs = GD.costForm(Xs, data.y);
  const fu = GD.costForm(Xu, data.y);
  near(fs.lmax, 1, 1e-9, 'scaled bowl is round (eigenvalues 1, 1)');
  near(fs.lmin, 1, 1e-9, 'scaled bowl is round (λmin)');
  ok(fu.lmax / fu.lmin > 50, `unscaled bowl is a long valley (λ ratio ${(fu.lmax / fu.lmin).toFixed(0)})`);
  ok(Math.abs(fs.opt[0] - 4) < 0.5 && Math.abs(fs.opt[1] - 3) < 0.3, `scaled minimum near (4, 3): ${fs.opt.map((v) => v.toFixed(2))}`);
  const mapped = GD.toUnscaled(fs.opt);
  near(mapped[0], fu.opt[0], 1e-9, 'same model in both parameterisations (θ₀)');
  near(mapped[1], fu.opt[1], 1e-9, 'same model in both parameterisations (θ₁)');
  near(fs.jmin, fu.jmin, 1e-9, 'same minimum cost either way');
  const run = (X, f, batch, start, seed) => {
    const p = GD.gdPath(X, data.y, { eta: 0.1, batch, epochs: 20, start, seed });
    return { p, ex: GD.cost(X, data.y, p.path.at(-1)) - f.jmin };
  };
  const bS = run(Xs, fs, 50, [1, 0.6], 1);
  const bU = run(Xu, fu, 50, GD.toUnscaled([1, 0.6]), 1);
  ok(bS.ex < 0.01 && bU.ex > 0.5, `batch GD after 20 epochs: scaled ${bS.ex.toFixed(4)} vs unscaled ${bU.ex.toFixed(2)} above the minimum`);
  near(GD.cost(Xs, data.y, [1, 0.6]), GD.cost(Xu, data.y, GD.toUnscaled([1, 0.6])), 1e-9, 'both views start from the same model');
  const steep = bU.p.path.slice(0, 6).map((th) => (th[0] - fu.opt[0]) * fu.vmax[0] + (th[1] - fu.opt[1]) * fu.vmax[1]);
  ok(steep.slice(1).every((v, i) => Math.sign(v) !== Math.sign(steep[i])), 'unscaled batch GD zig-zags across the valley');
  for (const [X, f, name] of [[Xs, fs, 'scaled'], [Xu, fu, 'unscaled']]) {
    const sgd = run(X, f, 1, name === 'scaled' ? [1, 0.6] : GD.toUnscaled([1, 0.6]), 3);
    ok(!sgd.p.diverged && sgd.ex > 1e-3, `SGD (${name}) stays bounded and keeps bouncing (excess ${sgd.ex.toFixed(3)})`);
  }
  const mS = run(Xs, fs, 10, [1, 0.6], 2);
  ok(mS.ex < run(Xs, fs, 1, [1, 0.6], 3).ex, 'mini-batch settles closer than SGD');
}

// ---------------------------------------------------------------- bias / variance (W3)
{
  const exact = [-2, -1, 0, 1, 2, 3].map((x) => [x, 0.5 * x * x + x + 2]);
  for (const x of [-2.5, 0.3, 2.9]) near(polyEval(polyFit(exact, 2), x), 0.5 * x * x + x + 2, 1e-6, `degree-2 fit reproduces a noise-free quadratic at x=${x}`);
  const data = makePolyData();
  eq([data.train.length, data.val.length], [20, 40], '20 training and 40 validation points');
  const c = errorCurve(data, 15);
  const best = c.reduce((a, b) => (b.val < a.val ? b : a));
  eq(best.d, 2, 'validation error is lowest at degree 2');
  // nested least-squares fits never raise training error; the 1e-8 ridge allows rises of ~1e-4 (invisible at 2 dp)
  ok(c.every((e, i) => i === 0 || e.train <= c[i - 1].train + 1e-3), 'training error never rises with degree (beyond ridge noise)');
  ok(c[0].train > 1.4 && c[0].val > 1.2, 'degree 1 underfits: both errors high');
  ok(c[14].val > 10 * best.val && c[14].train < c[1].train, 'degree 15 overfits: low training, high validation error');
  const s = shots(0.75, 0.08);
  near(Math.hypot(...s.mean), 0.72 * 0.75, 1e-12, "bull's-eye: mean shot offset = bias");
  eq([level(0.75), level(0.08)], ['high', 'low'], '2025 Q20 case: high bias, low variance');
}

// ---------------------------------------------------------------- activations (W6)
{
  near(ACTS.sigmoid.d(0), 0.25, 1e-12, "sigmoid'(0) = 0.25");
  near(ACTS.tanh.d(0), 1, 1e-12, "tanh'(0) = 1");
  eq([ACTS.relu.d(2), ACTS.relu.d(-2)], [1, 0], 'ReLU slope 1 for z > 0, 0 for z < 0');
  near(SIGMOID_SAT_Z, 2.887, 0.001, 'sigmoid saturates for |z| > 2.887');
  near(TANH_SAT_Z, 2.178, 0.001, 'tanh saturates for |z| > 2.178');
  near(ACTS.sigmoid.d(SIGMOID_SAT_Z), 0.05, 1e-12, 'sigmoid slope 0.05 at the edge');
  const si = saturatedIntervals('sigmoid');
  ok(si.length === 2 && Math.abs(si[0][1] + SIGMOID_SAT_Z) < 0.01 && Math.abs(si[1][0] - SIGMOID_SAT_Z) < 0.01, `sigmoid shading ${JSON.stringify(si.map((p) => p.map((v) => +v.toFixed(2))))}`);
  const ri = saturatedIntervals('relu');
  ok(ri.length === 1 && ri[0][0] === -5 && Math.abs(ri[0][1]) < 0.01, `ReLU shading z < 0 ${JSON.stringify(ri)}`);
  eq(saturatedIntervals('step').map((p) => p.map((v) => Math.round(v))), [[-5, 5]], 'step: slope 0 everywhere');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
