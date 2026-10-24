// Team c maths checks: run with `node tools/check-c.mjs`. Exits non-zero on any failed assertion.
import { attend, mix, DRINKS, SENT_SCORES, selfAttention } from '../src/widgets/attention-calc-math.js';
import { dbscan, EXAM_POINTS, EXAM_EPS } from '../src/widgets/dbscan-lab-math.js';
import { rates, PRESETS as FAIR } from '../src/widgets/fairness-calc-math.js';
import { RATIOS12, chooseD, cumsum, elbow, makeCloud, cov2, pca2, varAlong } from '../src/widgets/pca-explorer-math.js';
import { nearBorder, avgDistance, mcDistance, EXACT_MEAN } from '../src/widgets/curse-dim-math.js';
import { makeBlobs, initRandom, assign, update, inertia, lloyd, chooseKCurves } from '../src/widgets/kmeans-stepper-math.js';
import { WORDS, PRESETS as ANALOGIES, analogy, rank } from '../src/widgets/embedding-analogy-math.js';
import { diagnose, ceiling } from '../src/widgets/fit-diagnosis-math.js';
import { rng } from '../src/lib/svg.js';

let fails = 0;
let passes = 0;
const notes = [];
function ok(cond, msg) {
  if (cond) passes++;
  else {
    fails++;
    console.log('FAIL', msg);
  }
}
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b} ± ${tol}`);

// ---------------------------------------------------------------- attention (W11 s16-17)
{
  const [alice, bob] = DRINKS.queries.map((q) => attend(q.v, DRINKS.keys.map((k) => k.v), DRINKS.dk));
  near(alice.dots[0], 0.74, 1e-12, 'Alice q·k apple');
  near(alice.dots[1], 0.32, 1e-12, 'Alice q·k lemon');
  near(alice.scaled[0], 0.523, 5e-4, 'Alice scaled apple');
  near(alice.scaled[1], 0.226, 5e-4, 'Alice scaled lemon');
  near(alice.weights[0], 0.574, 5e-4, 'Alice weight apple (57.4%)');
  near(alice.weights[1], 0.426, 5e-4, 'Alice weight lemon (42.6%)');
  near(bob.dots[0], 0.42, 1e-12, 'Bob q·k apple');
  near(bob.dots[1], 0.56, 1e-12, 'Bob q·k lemon');
  near(bob.scaled[0], 0.297, 5e-4, 'Bob scaled apple');
  near(bob.scaled[1], 0.396, 5e-4, 'Bob scaled lemon');
  near(bob.weights[0], 0.475, 5e-4, 'Bob weight apple (47.5%)');
  near(bob.weights[1], 0.525, 5e-4, 'Bob weight lemon (52.5%)');
  ok(Math.abs(alice.weights[0] + alice.weights[1] - 1) < 1e-12, 'softmax weights sum to 1');
  const out = mix([0.25, 0.75], [[1, 0], [0, 1]]);
  ok(out[0] === 0.25 && out[1] === 0.75, 'mix = weighted average of values');
  const W = selfAttention(SENT_SCORES, true);
  ok(W[0][0] === 1 && W[0].slice(1).every((w) => w === 0), 'causal mask: first token attends only to itself');
  ok(W.every((row, i) => row.every((w, j) => (j > i ? w === 0 : w > 0))), 'causal mask: future weights exactly 0');
  ok(W.every((row) => Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-12), 'masked rows still sum to 1');
  ok(512 / 8 === 64, 'd_k = d_model / h = 512 / 8 = 64');
}

// ---------------------------------------------------------------- DBSCAN 2019 paper Q53
{
  const want = {
    'self-2': 'CCOCCCC',
    'self-3': 'OOOBCCC',
    'nbr-2': 'OOOBCCC',
    'nbr-3': 'OOOBCBB',
  };
  for (const [key, labels] of Object.entries(want)) {
    const [conv, ms] = key.split('-');
    const r = dbscan(EXAM_POINTS, EXAM_EPS, +ms, conv === 'self');
    ok(r.kind.join('') === labels, `DBSCAN Q53 ${conv === 'self' ? 'incl. itself' : 'neighbours only'}, min_samples ${ms}: got ${r.kind.join('')}, want ${labels}`);
  }
  const r2 = dbscan(EXAM_POINTS, EXAM_EPS, 2, true);
  ok(r2.clusters === 2 && r2.outliers === 1, 'Q53 min_samples 2 (incl.): 2 clusters, 1 outlier');
  const r3 = dbscan(EXAM_POINTS, EXAM_EPS, 3, true);
  ok(r3.clusters === 1 && r3.outliers === 3 && r3.label[2] === -1, 'Q53 min_samples 3 (incl.): 1 cluster, 3 outliers (label −1)');
}

// ---------------------------------------------------------------- fairness (W12b s3-6)
{
  const [ns, sw] = FAIR.sweden.groups.map(rates);
  near(ns.fnr, 0.5, 1e-12, 'non-Swedes FNR');
  near(sw.fnr, 50 / 450, 1e-12, 'Swedes FNR (0.111)');
  near(ns.fnr / sw.fnr, 4.5, 1e-9, 'interested non-Swede 4.5× more likely NOT recommended');
  near(ns.fpr, 0.25, 1e-12, 'non-Swedes FPR');
  near(sw.fpr, 350 / 750, 1e-12, 'Swedes FPR (0.467)');
  near(sw.fpr / ns.fpr, 1.8667, 1e-4, 'Swedes almost 2× the unwanted recommendations');

  const [b, w] = FAIR.compas.groups.map(rates);
  // exact fractions first (formula check), then against the slide's printed percentages
  near(b.fpr, 805 / 1795, 1e-12, 'COMPAS black FPR');
  near(w.fpr, 349 / 1488, 1e-12, 'COMPAS white FPR');
  near(b.tpr, 1369 / 1901, 1e-12, 'COMPAS black TPR');
  near(w.tpr, 505 / 966, 1e-12, 'COMPAS white TPR');
  near(b.base, 1901 / 3696, 1e-12, 'COMPAS black base rate');
  near(w.base, 966 / 2454, 1e-12, 'COMPAS white base rate');
  near(b.ppv, 1369 / 2174, 1e-12, 'COMPAS black precision');
  near(w.ppv, 505 / 854, 1e-12, 'COMPAS white precision');
  const slide = [
    ['black FPR', b.fpr, 44.8],
    ['white FPR', w.fpr, 23.4],
    ['black TPR', b.tpr, 72],
    ['white TPR', w.tpr, 52.2],
    ['black reoffending (base) rate', b.base, 51.4],
    ['white reoffending (base) rate', w.base, 39.2],
    ['black precision', b.ppv, 63],
    ['white precision', w.ppv, 59.1],
  ];
  for (const [name, v, s] of slide) {
    const pc = v * 100;
    ok(Math.abs(pc - s) < 0.2, `COMPAS ${name} within 0.2 pp of slide (${pc.toFixed(2)}% vs ${s}%)`);
    if (Math.abs(pc - s) > 0.05) notes.push(`COMPAS ${name}: table gives ${pc.toFixed(2)}%, slide prints ${s}%`);
  }
  // impossibility identity: FPR = p/(1−p) · (1−PPV)/PPV · TPR
  for (const g of [b, w, ns, sw]) near(g.fpr, (g.base / (1 - g.base)) * ((1 - g.ppv) / g.ppv) * g.tpr, 1e-12, 'FPR identity');
}

// ---------------------------------------------------------------- PCA (W10a s9-12)
{
  near(cumsum(RATIOS12).at(-1), 1, 1e-9, '12 ratios sum to 1');
  ok(chooseD(RATIOS12, 0.95) === 10, `d for t = 0.95 is 10 (got ${chooseD(RATIOS12, 0.95)})`);
  ok(chooseD(RATIOS12, 0.8) === 6, 'd for t = 0.80 is 6');
  ok(chooseD(RATIOS12, 0.9) === 8, 'd for t = 0.90 is 8');
  ok(chooseD(RATIOS12, 0.94) === 9, 'd for t = 0.94 is 9 (cumsum exactly 0.94 counts)');
  ok(chooseD(RATIOS12, 0.99) === 11, 'd for t = 0.99 is 11');
  ok(chooseD([0.84248607, 0.14631839], 0.95) === 2, 'slide s11 ratios [0.842, 0.146] → d = 2 for 0.95');
  ok(elbow(RATIOS12) === 4, `elbow of the 12-component curve at 4 (got ${elbow(RATIOS12)})`);
  const C = cov2(makeCloud(120, 27));
  const e = pca2(C);
  near(e.ratio[0], 0.84, 0.005, 'demo cloud explained_variance_ratio_[0] ≈ 0.84');
  let best = 0;
  let bestDeg = 0;
  for (let d = 0; d < 180; d += 0.1) {
    const v = varAlong(C, d);
    if (v > best) {
      best = v;
      bestDeg = d;
    }
  }
  near(bestDeg, e.deg, 0.11, 'max captured variance is at the PC1 angle');
  near(best, e.l1, 1e-4, 'max captured variance = λ1');
  near(varAlong(C, e.deg + 90), e.l2, 1e-9, 'PC2 (orthogonal) captures λ2');
}

// ---------------------------------------------------------------- curse of dimensionality (W10a s5-6)
{
  near(nearBorder(2), 0.004, 5e-5, '2-D: 0.4% within 0.001 of a border');
  ok(nearBorder(10000) > 0.99999999, '10,000-D: > 99.999999% near a border');
  near(EXACT_MEAN[2], 0.5214, 5e-5, 'unit square mean distance 0.52');
  near(EXACT_MEAN[3], 0.6617, 5e-5, 'unit cube mean distance 0.66');
  near(avgDistance(2).sd, 0.248, 5e-4, 'unit square sd 0.248');
  near(avgDistance(3).sd, 0.249, 5e-4, 'unit cube sd 0.249');
  near(avgDistance(1e6).mean, 408.25, 0.005, '1,000,000-D mean distance 408.25');
  near(mcDistance(3, 20000).mean, EXACT_MEAN[3], 0.01, 'Monte-Carlo agrees with the exact cube value');
  near(avgDistance(100).mean, Math.sqrt(100 / 6) * (1 - 0.175 / 100), 0.02, 'MC at d = 100 meets the large-d approximation');
}

// ---------------------------------------------------------------- k-means (W10b s9-18)
{
  const pts = makeBlobs(3);
  ok(pts.length === 200, '200 points');
  const r = rng(77);
  let monotone = true;
  const finals = new Set();
  for (let t = 0; t < 12; t++) {
    let c = initRandom(pts, 4, r);
    let labels = assign(pts, c);
    let last = inertia(pts, labels, c);
    for (let i = 0; i < 40; i++) {
      c = update(pts, labels, c);
      const a = inertia(pts, labels, c);
      labels = assign(pts, c);
      const b = inertia(pts, labels, c);
      if (a > last + 1e-9 || b > a + 1e-9) monotone = false;
      last = b;
    }
    finals.add(lloyd(pts, initRandom(pts, 4, r)).inertia.toFixed(1));
  }
  ok(monotone, 'inertia never increases over assign/update steps');
  ok(finals.size >= 2, `random inits reach different local optima (${[...finals].join(', ')})`);
  const curves = chooseKCurves(pts);
  ok(curves.every((c, i) => i === 0 || c.inertia <= curves[i - 1].inertia + 1e-9), 'best inertia drops as k grows');
  const bestSil = curves.filter((c) => c.sil != null).reduce((a, c) => (c.sil > a.sil ? c : a));
  ok(bestSil.k === 4, `silhouette peaks at k = 4 (got ${bestSil.k})`);
}

// ---------------------------------------------------------------- word analogies (W11 s7-8)
for (const p of ANALOGIES) {
  const D = analogy(p.a, p.b, p.c);
  ok(rank(D, [p.a, p.b, p.c], 'cos')[0].w === p.want, `${p.a} : ${p.b} :: ${p.c} : ${p.want} (cosine)`);
  ok(rank(D, [p.a, p.b, p.c], 'dist')[0].w === p.want, `${p.a} : ${p.b} :: ${p.c} : ${p.want} (distance)`);
}
ok(Object.keys(WORDS).length === 16, '16 words');

// ---------------------------------------------------------------- fit diagnosis (W12a s7-12)
ok(diagnose({ train: 18, holdout: 19, target: 5 }).step === 'train', 'underfit preset → reduce training error');
ok(diagnose({ train: 2, holdout: 15, target: 5 }).step === 'gap', 'overfit preset → reduce gap');
ok(diagnose({ train: 2, trainVal: 3, holdout: 14, target: 5 }).step === 'mismatch', 'mismatch preset → fix mismatch');
ok(diagnose({ train: 3, holdout: 4, target: 5 }).step === 'done', 'fine preset → done');
{
  const d = diagnose({ train: 2, trainVal: 3, holdout: 14, target: 5 });
  ok(d.gap === 1 && d.mismatch === 11, 'E_hold-out = E_train + gap + mismatch (2 + 1 + 11 = 14)');
}
near(ceiling(0.9, 100, 10), 0.01, 1e-12, 'W12a s11: 10 of 100 errors → at most ~1%');
near(ceiling(0.9, 100, 30), 0.03, 1e-12, 'W12a s11: 30 of 100 → at most ~3%');
near(ceiling(0.9, 100, 15), 0.015, 1e-12, 'W12a s11: 15 of 100 → at most ~1.5%');

console.log(`\n${passes} passed, ${fails} failed`);
if (notes.length) console.log('Slide discrepancies (formula is right; the slide rounds down or differs):\n  ' + notes.join('\n  '));
process.exit(fails ? 1 : 0);
