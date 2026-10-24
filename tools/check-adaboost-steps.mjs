// Checks the AdaBoost maths against the lecture's worked example (W7 s30-32). Run: node tools/check-adaboost-steps.mjs
import { ACTUAL, LECTURE_PREDS, runAdaBoost, alphaOf, weightedVote } from '../src/widgets/adaboost-steps-math.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a.toFixed(5)}, want ${b} ± ${tol}`);

const R = runAdaBoost(ACTUAL, LECTURE_PREDS, 1);
const [r1, r2, r3] = R;
const wrongIdx = (rd) => rd.wrong.map((w, i) => (w ? i + 1 : 0)).filter(Boolean);

// round 1 (s30)
ok(JSON.stringify(wrongIdx(r1)) === '[3,6,8]', `round 1 misclassifies rows 3, 6, 8 (${wrongIdx(r1)})`);
near(r1.r, 0.3, 1e-12, 'r1');
near(r1.alpha, Math.log(0.7 / 0.3), 1e-12, 'alpha1 = ln(0.7/0.3)');
near(r1.alpha, 0.847, 5e-4, 'alpha1 vs slide 0.847');
near(r1.updated[2], 0.233, 5e-4, 'updated weight of a misclassified row');
near(r1.updated[0], 0.1, 1e-12, 'correct rows keep 0.1');
near(r1.sumUpdated, 1.4, 1e-12, 'sum after update');
near(r1.normalised[0], 0.07147, 2e-4, 'normalised correct row vs slide 0.07147');
near(r1.normalised[2], 0.16654, 2e-4, 'normalised wrong row vs slide 0.16654');
near(r1.normalised[0], 1 / 14, 1e-12, 'exact: 0.1 / 1.4 = 1/14');

// round 2 (s31)
ok(JSON.stringify(wrongIdx(r2)) === '[1,2,6,8]', `round 2 misclassifies rows 1, 2, 6, 8 (${wrongIdx(r2)})`);
near(r2.r, 0.476, 5e-4, 'r2 vs slide 0.476');
near(r2.r, 10 / 21, 1e-12, 'exact r2 = 1/7 + 1/3 = 10/21');
near(r2.alpha, 0.0958, 1e-3, 'alpha2 vs slide 0.0958 (exact ln 1.1 = 0.0953)');
near(r2.updated[0], 0.079, 5e-4, 'round 2 updated rows 1-2 vs slide 0.079');
near(r2.updated[5], 0.183, 5e-4, 'round 2 updated rows 6, 8 vs slide 0.183');
[[0, 0.075], [2, 0.159], [3, 0.068], [5, 0.175]].forEach(([i, v]) => near(r2.normalised[i], v, 1e-3, `round 2 normalised row ${i + 1} vs slide ${v}`));

// round 3 (s32)
ok(JSON.stringify(wrongIdx(r3)) === '[4,5,7]', `round 3 misclassifies rows 4, 5, 7 (${wrongIdx(r3)})`);
near(r3.r, 0.204, 1e-3, 'r3 vs slide 0.204');
near(r3.alpha, 1.3575, 2e-3, 'alpha3 vs slide 1.3575');
near(r3.alpha, 1.36, 5e-3, 'alpha3 ~ 1.36');
near(r3.updated[3], 0.2651, 5e-4, 'round 3 updated weight vs slide 0.2651');
[[0, 0.0472], [2, 0.0999], [3, 0.1667], [5, 0.11], [8, 0.0429]].forEach(([i, v]) => near(r3.normalised[i], v, 5e-4, `round 3 normalised row ${i + 1} vs slide ${v}`));

// properties
R.forEach((rd, j) => near(rd.normalised.reduce((s, v) => s + v, 0), 1, 1e-12, `round ${j + 1} weights sum to 1`));
R.forEach((rd, j) => near(rd.normalised.reduce((s, v, i) => s + (rd.wrong[i] ? v : 0), 0), 0.5, 1e-12, `round ${j + 1}: with eta = 1 the misclassified rows end with exactly half the weight`));
near(alphaOf(0.5), 0, 1e-15, 'alpha = 0 at r = 0.5');
ok(alphaOf(0) === Infinity, 'alpha = +inf at r = 0 (perfect learner)');
ok(alphaOf(0.7) < 0, 'alpha < 0 above r = 0.5');
near(alphaOf(0.3, 0.5), 0.5 * Math.log(0.7 / 0.3), 1e-12, 'learning rate scales alpha');
const half = runAdaBoost(ACTUAL, LECTURE_PREDS, 0.5);
ok(half[0].updated[2] < r1.updated[2], 'smaller eta -> smaller boost of misclassified weights');

// final weighted vote after 3 rounds
const v3 = weightedVote(R, 2); // instance 3: R1 says 0, R2 and R3 say 1
near(v3.score[1], r2.alpha + r3.alpha, 1e-12, 'instance 3: class 1 gets alpha2 + alpha3');
near(v3.score[0], r1.alpha, 1e-12, 'instance 3: class 0 gets alpha1');
ok(v3.pred === 1, 'instance 3 predicted 1 (right)');
const v4 = weightedVote(R, 3); // instance 4: R3 alone (1.358) beats R1 + R2 (0.943)
ok(v4.pred === 1 && ACTUAL[3] === 0, 'instance 4: the strong round-3 learner outvotes rounds 1+2 (predicts 1, actual 0)');
const right = ACTUAL.filter((y, i) => weightedVote(R, i).pred === y).length;
ok(right === 7, `ensemble after 3 rounds gets 7 of 10 right (${right})`);

// degenerate learner: perfect round leaves weights unchanged
const perfect = runAdaBoost(ACTUAL, [ACTUAL.slice()], 1)[0];
ok(perfect.r === 0 && perfect.alpha === Infinity && perfect.normalised.every((v) => Math.abs(v - 0.1) < 1e-12), 'perfect learner: r = 0, alpha = inf, weights unchanged');

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall AdaBoost checks passed');
process.exit(fails ? 1 : 0);
