// Checks hard vs soft voting on the slide example (W7 FAQ3) and the 2024 test question. Run: node tools/check-voting-calc.mjs
import { hardVote, softVote, countLabels } from '../src/widgets/voting-calc-math.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a.toFixed(4)}, want ${b}`);

const faq3 = [[0.95, 0.05], [0.45, 0.55], [0.4, 0.6]];
const h = hardVote(faq3);
const s = softVote(faq3);
ok(h.winner === 1 && h.counts.join() === '1,2', 'FAQ3 hard voting: Class 2 by 2 votes to 1');
near(s.sums[0], 1.8, 1e-12, 'FAQ3 sum class 1');
near(s.sums[1], 1.2, 1e-12, 'FAQ3 sum class 2');
near(s.avg[0], 0.6, 1e-12, 'FAQ3 soft average class 1');
ok(s.winner === 0, 'FAQ3 soft voting: Class 1');

const minority = [[0.9, 0.05, 0.05], [0.85, 0.1, 0.05], [0.35, 0.45, 0.2], [0.3, 0.4, 0.3], [0.25, 0.45, 0.3]];
const hm = hardVote(minority);
const sm = softVote(minority);
ok(hm.winner === 1 && sm.winner === 0, 'confident minority: hard -> Class 2, soft -> Class 1');
near(sm.avg[0], 0.53, 1e-12, 'confident minority average class 1');

ok(softVote([[1.1, 0], [0.2, 0.8], [0.3, 0.7]]).rows[0][0] === 1, 'rows that do not sum to 1 are rescaled before averaging');

const t24 = countLabels(['Dog', 'Cat', 'Cat', 'Iguana', 'Penguin'], ['Dog', 'Cat', 'Iguana', 'Penguin']);
ok(['Dog', 'Cat', 'Iguana', 'Penguin'][t24.winner] === 'Cat' && !t24.tie, '2024 test Q7: hard vote = Cat (2 of 5)');

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall voting checks passed');
process.exit(fails ? 1 : 0);
