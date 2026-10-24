// Checks the 1-D regression tree and the gradient boosting loop (W7 s34-38). Run: node tools/check-gradboost-residuals.mjs
import { makeData, fitTree, predictTree, thresholds, boost, predictStage } from '../src/widgets/gradboost-residuals-math.js';
import { rng } from '../src/lib/svg.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};

const sse = (ys) => {
  const m = ys.reduce((s, v) => s + v, 0) / ys.length;
  return ys.reduce((s, v) => s + (v - m) ** 2, 0);
};
const treeSse = (t, xs, ys) => xs.reduce((s, x, i) => s + (ys[i] - predictTree(t, x)) ** 2, 0);

// depth-1 tree = the best single split found by brute force
const r = rng(7);
for (let trial = 0; trial < 20; trial++) {
  const n = 12 + r.int(30);
  const xs = Array.from({ length: n }, () => r() - 0.5).sort((a, b) => a - b);
  const ys = xs.map((x) => Math.sin(6 * x) + 0.3 * r.normal());
  let best = Infinity;
  for (let i = 1; i < n; i++) best = Math.min(best, sse(ys.slice(0, i)) + sse(ys.slice(i)));
  const t = fitTree(xs, ys, 1);
  if (Math.abs(treeSse(t, xs, ys) - best) > 1e-9) ok(false, `trial ${trial}: stump SSE ${treeSse(t, xs, ys)} != brute force ${best}`);
}
ok(true, 'depth-1 trees match a brute-force best split on 20 random sets');

// depth-2 tree = brute force over all nested splits
for (let trial = 0; trial < 8; trial++) {
  const n = 10 + r.int(10);
  const xs = Array.from({ length: n }, () => r() - 0.5).sort((a, b) => a - b);
  const ys = xs.map((x) => 3 * x * x + 0.05 * r.normal());
  const bestSplit = (a, b) => {
    let v = sse(ys.slice(a, b));
    for (let i = a + 1; i < b; i++) v = Math.min(v, sse(ys.slice(a, i)) + sse(ys.slice(i, b)));
    return v;
  };
  let best = Infinity;
  for (let i = 1; i < n; i++) best = Math.min(best, bestSplit(0, i) + bestSplit(i, n));
  const t = fitTree(xs, ys, 2);
  // greedy CART is not always the global optimum at depth 2, but it can never beat it
  ok(treeSse(t, xs, ys) >= best - 1e-9, `trial ${trial}: greedy depth-2 SSE ${treeSse(t, xs, ys).toFixed(5)} >= optimum ${best.toFixed(5)}`);
}
const t3 = fitTree([0, 1, 2, 3, 4, 5, 6, 7], [0, 0, 1, 1, 5, 5, 9, 9], 2);
ok(thresholds(t3).sort().join() === '1.5,3.5,5.5', `depth 2 splits a 4-step staircase at its steps (${thresholds(t3).sort()})`);
ok([0, 2, 4, 6].map((x) => predictTree(t3, x)).join() === '0,1,5,9', 'and predicts each step exactly');

// boosting: the first tree fits y; each later tree fits the residuals; F_k = lr * sum
const d = makeData(353);
const b1 = boost(d.train, d.val, 3, 1, 2);
const xs = d.train.map((p) => p[0]);
ok(b1.resid[0].every((v, i) => v === d.train[i][1]), 'tree 1 is fit to y');
ok(b1.resid[1].every((v, i) => Math.abs(v - (d.train[i][1] - predictTree(b1.trees[0], xs[i]))) < 1e-12), 'tree 2 is fit to y - h1(x)');
ok(xs.every((x, i) => Math.abs(predictStage(b1.trees, 3, 1, x) - b1.trees.reduce((s, t) => s + predictTree(t, x), 0)) < 1e-12), 'prediction = h1 + h2 + h3 (lr = 1)');

// training MSE never increases when lr <= 1 (each tree is a least-squares fit to the residuals)
for (const lr of [1, 0.5, 0.1, 0.05]) {
  const b = boost(d.train, d.val, 120, lr, 2);
  ok(b.trainMse.every((v, i) => i === 0 || v <= b.trainMse[i - 1] + 1e-12), `lr ${lr}: training MSE never goes up`);
}

// the widget's data seed reproduces the lecture's early-stopping result (s38: best 55 of 120)
const lect = boost(d.train, d.val, 120, 0.1, 2);
ok(lect.best === 55, `lr 0.1, max_depth 2, 120 trees: validation minimum at ${lect.best} trees (lecture: 55)`);
ok(lect.valMse[119] > lect.valMse[54] * 1.2, 'validation error clearly rises after the minimum (overfitting)');
const bests = [1, 0.5, 0.2, 0.1, 0.05].map((lr) => boost(d.train, d.val, 120, lr, 2).best);
ok(bests.every((v, i) => i === 0 || v > bests[i - 1]), `lower learning rate -> more trees at the minimum (${bests.join(', ')})`);

const t0 = performance.now();
boost(d.train, d.val, 120, 0.1, 3);
const ms = performance.now() - t0;
ok(ms < 30, `120 depth-3 trees fit in ${ms.toFixed(1)} ms (< 30)`);

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall gradient boosting checks passed');
process.exit(fails ? 1 : 0);
