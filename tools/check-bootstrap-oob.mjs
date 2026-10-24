// Checks bootstrap / pasting bags and the out-of-bag fraction (W7 s13, FAQ1, FAQ4). Run: node tools/check-bootstrap-oob.mjs
import { drawBag, bagStats, expectedOob, SLIDE_SEED, bagSeed } from '../src/widgets/bootstrap-oob-math.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a.toFixed(5)}, want ${b} ± ${tol}`);

// the widget's first bag reproduces FAQ4 exactly
const first = drawBag(100, 100, bagSeed(0, 0), true);
ok(bagSeed(0, 0) === SLIDE_SEED, 'bag 0 uses the slide seed');
const st = bagStats(first);
ok(JSON.stringify(st.hist) === '[36,37,20,5,2]', `FAQ4 histogram missing/once/twice/3x/4x = 36/37/20/5/2 (got ${st.hist.join('/')})`);
ok(st.missing === 36 && st.once === 37 && st.twice === 20 && st.more === 7, 'stats: missing 36, once 37, twice 20, 3+ 7');
ok(first.reduce((s, c) => s + c, 0) === 100, '100 draws in the bag');
ok(st.unique === 64, '64 distinct instances in that bag');

// expected out-of-bag fraction
near(expectedOob(100, 100), 0.99 ** 100, 1e-15, '(1 - 1/100)^100');
near(expectedOob(100, 100), 0.366, 5e-4, 'm = 100: 36.6% out-of-bag');
near(expectedOob(1e6, 1e6), Math.exp(-1), 1e-6, '(1 - 1/m)^m -> e^-1 = 0.3679');
near(1 - Math.exp(-1), 0.632, 5e-4, 'in-bag distinct fraction -> 63.2% (slide says "about 67%")');
near(expectedOob(10, 10), 0.3487, 1e-4, 'm = 10: 0.3487');
near(expectedOob(1000, 1000), 0.3677, 1e-4, 'm = 1000: 0.3677');

// simulation: the running average settles near the expected value
let s = 0;
const B = 3000;
for (let i = 0; i < B; i++) s += bagStats(drawBag(100, 100, bagSeed(i, 0), true)).oobFrac;
near(s / B, expectedOob(100, 100), 0.004, `average OOB over ${B} bags`);

// pasting: no duplicates, bag must be smaller than m
const paste = drawBag(100, 60, bagSeed(0, 2060), false);
ok(paste.every((c) => c === 0 || c === 1), 'pasting: no instance appears twice');
ok(bagStats(paste).missing === 40, 'pasting 60 of 100 leaves out exactly 40');
near(expectedOob(100, 60, false), 0.4, 1e-12, 'pasting expected OOB = 1 - k/m');
ok(bagStats(drawBag(100, 100, 5, false)).missing === 0, 'pasting with max_samples = m: the bag is the whole training set (nothing out-of-bag)');

// bagging can use other sizes
near(expectedOob(100, 200), 0.99 ** 200, 1e-15, 'bagging with max_samples = 2m');

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall bootstrap checks passed');
process.exit(fails ? 1 : 0);
