// Checks majority-vote accuracy against the slides (W7 s6 "1000 x 51%", FAQ2 "3 x 60% = 64.8%").
// Run: node tools/check-ensemble-accuracy.mjs
import { majorityAcc, binomAtLeast, binomPmf, mixtureAcc, cases3, N_STEPS, N_CURVE, oddCurve } from '../src/widgets/ensemble-accuracy-math.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a.toFixed(6)}, want ${b} ± ${tol}`);

// FAQ2: three independent 60% voters
near(majorityAcc(3, 0.6), 0.648, 1e-12, '3 voters x 60% -> 64.8%');
near(3 * 0.6 ** 2 * 0.4 + 0.6 ** 3, 0.648, 1e-12, 'closed form 3p^2(1-p) + p^3');
const c = cases3(0.6);
ok(c.length === 8, '8 cases');
near(c.reduce((s, x) => s + x.prob, 0), 1, 1e-12, 'the 8 cases sum to 1');
near(c.filter((x) => x.correct).reduce((s, x) => s + x.prob, 0), 0.648, 1e-12, 'correct cases sum to 0.648');
near(c.find((x) => x.pat === 'wcw').prob, 0.096, 1e-12, 'w c w = 0.4 x 0.6 x 0.4 = 0.096 (slide prints 0.144: typo)');
ok(c.filter((x) => x.correct).map((x) => x.pat).join() === 'ccc,ccw,cwc,wcc', 'majority right in ccc, ccw, cwc, wcc');

// s6: 1000 voters at 51%
const s1000 = majorityAcc(1000, 0.51);
ok(s1000 >= 0.726 && s1000 <= 0.727, `1000 voters x 51%, strict majority (501+) = ${(s1000 * 100).toFixed(2)}% (72.6-72.7%)`);
const tie = binomAtLeast(1000, 500, 0.51);
ok(tie > 0.745 && tie < 0.75, `P(at least 500 of 1000) = ${(tie * 100).toFixed(2)}%: the textbook's ~75% counts the tie as a win`);
const s1001 = majorityAcc(1001, 0.51);
ok(s1001 > 0.736 && s1001 < 0.737, `1001 voters x 51% = ${(s1001 * 100).toFixed(2)}% (no ties possible)`);

// sanity of the binomial
near(Array.from({ length: 1002 }, (_, k) => binomPmf(1001, k, 0.51)).reduce((s, v) => s + v, 0), 1, 1e-9, 'pmf over k = 0..1001 sums to 1');
near(majorityAcc(1, 0.6), 0.6, 1e-12, 'one voter = p');
near(majorityAcc(101, 0.5), 0.5, 1e-9, 'coin-flip voters stay at 50% (odd n)');
ok(majorityAcc(101, 0.45) < 0.45 && majorityAcc(1001, 0.45) < majorityAcc(101, 0.45), 'p < 0.5: more voters -> worse');
ok(majorityAcc(101, 0.6) > majorityAcc(11, 0.6) && majorityAcc(11, 0.6) > 0.6, 'p > 0.5: more voters -> better');

// correlation mixture
near(mixtureAcc(101, 0.6, 1), 0.6, 1e-12, 'rho = 1 (identical models): ensemble = one model');
near(mixtureAcc(101, 0.6, 0), majorityAcc(101, 0.6), 1e-12, 'rho = 0: independent binomial');
near(mixtureAcc(3, 0.6, 0.5), 0.5 * 0.6 + 0.5 * 0.648, 1e-12, 'rho = 0.5 mixes linearly');

// slider ladder
ok(N_STEPS[0] === 1 && N_STEPS[N_STEPS.length - 1] === 1001 && N_STEPS.every((n) => n % 2 === 1), 'n steps are odd, 1..1001');
ok(N_CURVE.every((n) => n % 2 === 1) && N_STEPS.every((n) => N_CURVE.includes(n)), 'curve samples are odd and include every slider step');
const t0 = performance.now();
oddCurve(0.6);
const ms = performance.now() - t0;
ok(ms < 30, `curve for one p computes in ${ms.toFixed(1)} ms (< 30)`);

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall ensemble-accuracy checks passed');
process.exit(fails ? 1 : 0);
