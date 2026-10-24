// Checks for src/widgets/svm-math.js (svm-margin, kernel-lift, rbf-gamma-c). Run: node tools/check-svm.mjs
import assert from 'node:assert/strict';
import { fitLinearSvm, fitKernelSvm, rbfKernel, rbfGrid, makeMoons, scalerFit, scalerApply, clipLine, zeroContour } from '../src/widgets/svm-math.js';
import { PRESETS } from '../src/widgets/svm-presets.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} ± ${tol}`);
let n = 0;
const ok = (m) => console.log('ok', ++n, m);

// 1. 2019 paper Q51 (hard margin): exactly two support vectors, (6.21, 6.24) and (10.01, 6.21); margin ≈ 3.80; boundary x ≈ 8.1
{
  const pts = PRESETS.exam2019.points;
  assert.equal(pts.length, 21);
  for (const C of [1000, 1e6]) {
    const f = fitLinearSvm(pts, C);
    assert.ok(f.converged, 'converged');
    const svs = f.sv.map((i) => [pts[i].x, pts[i].y]).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(svs, [[6.21, 6.24], [10.01, 6.21]], 'support vectors');
    near(f.width, 3.8001, 0.002, 'margin width');
    // boundary is the perpendicular bisector of the two SVs: crosses y = 6.2 at x ≈ 8.11
    const xAt = (y) => -(f.w[1] * y + f.b) / f.w[0];
    near(xAt(6.225), 8.11, 0.01, 'boundary at mid height');
    assert.equal(f.violations, 0);
    assert.equal(f.acc, 1);
    // functional margin of the SVs is 1 (they sit on the street edges)
    f.sv.forEach((i) => near(f.margins[i], 1, 1e-4, 'SV on edge'));
  }
  ok('exam 2019 Q51: SVs (6.21,6.24) & (10.01,6.21), width 3.80, boundary x ≈ 8.11');
}

// 2. Simple separable case: (0,0),(1,0) vs (3,0),(4,0) → boundary x = 2, margin 2, SVs (1,0) & (3,0)
{
  const pts = [
    { x: 0, y: 0, c: 'A' }, { x: 1, y: 0, c: 'A' }, { x: 1, y: 1, c: 'A' },
    { x: 3, y: 0, c: 'B' }, { x: 4, y: 0, c: 'B' }, { x: 3, y: 1, c: 'B' },
  ];
  const f = fitLinearSvm(pts, 1000);
  near(f.width, 2, 1e-4, 'margin');
  near(-f.b / f.w[0], 2, 1e-4, 'boundary x');
  near(f.w[1], 0, 1e-6, 'w2 = 0');
  assert.ok(f.w[0] < 0, 'class A (t = +1) on the left');
  // moving a non-support vector does not change the solution
  const g = fitLinearSvm(pts.map((p, i) => (i === 0 ? { ...p, x: -2, y: 0.5 } : p)), 1000);
  near(g.w[0], f.w[0], 1e-6, 'w unchanged');
  near(g.b, f.b, 1e-6, 'b unchanged');
  ok('separable toy: boundary x = 2, margin 2; dragging a non-SV leaves w, b unchanged');
}

// 3. Soft margin: small C → wider street, more support vectors and violations (Outlier preset, slide W8 s5–6)
{
  const pts = PRESETS.outlier.points;
  const hard = fitLinearSvm(pts, 1000);
  const soft = fitLinearSvm(pts, 1);
  const softer = fitLinearSvm(pts, 0.01);
  assert.equal(hard.violations, 0, 'hard margin has no violations');
  assert.ok(soft.width > 1.5 * hard.width, `C=1 street wider (${soft.width} vs ${hard.width})`);
  assert.ok(soft.violations >= 1, 'C=1 lets the outlier violate the margin');
  const small = fitLinearSvm(pts, 0.1);
  assert.ok(small.sv.length > hard.sv.length, `more SVs with small C (${small.sv.length} vs ${hard.sv.length})`);
  assert.ok(small.width > soft.width && small.violations > soft.violations, 'C=0.1 wider still, more violations');
  assert.ok(softer.sv.length > small.sv.length && softer.width > small.width, 'C=0.01 even wider');
  ok(`outlier: C 1000 → 1 → 0.1 → 0.01: width ${[hard, soft, small, softer].map((f) => f.width.toFixed(2)).join(' → ')}; SVs ${[hard, soft, small, softer].map((f) => f.sv.length).join(' → ')}; violations ${[hard, soft, small, softer].map((f) => f.violations).join(' → ')}`);
}

// 4. Unscaled (slide W8 s4): raw street is narrow in standard-deviation units; standardising widens it
{
  const pts = PRESETS.unscaled.points;
  const raw = fitLinearSvm(pts, 1000);
  const s = scalerFit(pts.map((p) => [p.x, p.y]));
  const zs = pts.map((p) => { const z = scalerApply(s, [p.x, p.y]); return { ...p, x: z[0], y: z[1] }; });
  const sc = fitLinearSvm(zs, 1000);
  const rawInSd = 2 / Math.hypot(raw.w[0] * s.sd[0], raw.w[1] * s.sd[1]);
  near(raw.width, Math.hypot(4, 10), 1e-3, 'raw width = |(5,60) − (1,50)|');
  assert.ok(sc.width > 2 * rawInSd, `scaled street wider (${sc.width} vs ${rawInSd})`);
  ok(`unscaled: raw street ${raw.width.toFixed(2)} raw units = ${rawInSd.toFixed(2)} sd; standardised street ${sc.width.toFixed(2)} sd; scaled SVs ${sc.sv.length}`);
}

// 5. Every preset converges with every slider C (deterministic, quick)
{
  for (const [k, p] of Object.entries(PRESETS)) {
    for (let e = -2; e <= 3; e += 0.5) {
      const t0 = performance.now();
      const f = fitLinearSvm(p.points, 10 ** e);
      const ms = performance.now() - t0;
      assert.ok(f.converged, `${k} C=1e${e} converged`);
      assert.ok(ms < 30, `${k} C=1e${e} took ${ms.toFixed(1)} ms`);
    }
  }
  ok('all presets converge for C = 0.01 … 1000 in < 30 ms');
}

// 6. Random 40-point clouds with overlapping (random) labels: the interior-point solver converges in a few
//    Newton steps for C up to 1000, satisfies the KKT conditions, and agrees with SMO run to convergence.
{
  let worst = 0;
  let worstIter = 0;
  let worstDiff = 0;
  for (let seed = 1; seed <= 30; seed++) {
    let a = seed * 9301 + 49297;
    const r = () => ((a = (a * 233280 + 49297) % 2147483647) / 2147483647);
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: r() * 10, y: r() * 7, c: i % 2 ? 'A' : 'B' }));
    for (const C of [0.01, 1, 1000]) {
      const t0 = performance.now();
      const f = fitLinearSvm(pts, C);
      worst = Math.max(worst, performance.now() - t0);
      worstIter = Math.max(worstIter, f.iter);
      assert.ok(f.converged, `random seed ${seed} C ${C}`);
      f.alpha.forEach((al, i) => {
        const m = f.margins[i];
        if (al <= 1e-6 * C) assert.ok(m >= 1 - 1e-5, `KKT α=0 ⇒ margin ≥ 1 (seed ${seed}, C ${C}, m ${m})`);
        else if (al >= C * (1 - 1e-6)) assert.ok(m <= 1 + 1e-5, 'KKT α=C ⇒ margin ≤ 1');
        else near(m, 1, 1e-5, 'KKT free SV on the edge');
      });
      const g = fitLinearSvm(pts, C, { solver: 'smo', maxIter: 5e6 });
      const d = Math.max(Math.abs(f.w[0] - g.w[0]), Math.abs(f.w[1] - g.w[1]), Math.abs(f.b - g.b)) / (1 + Math.abs(g.b));
      worstDiff = Math.max(worstDiff, d);
      assert.ok(d < 1e-4, `IPM vs SMO (seed ${seed}, C ${C}): ${d}`);
    }
  }
  assert.ok(worst < 30, `slowest fit ${worst.toFixed(1)} ms`);
  ok(`random overlapping 40-point clouds: KKT holds, ≤ ${worstIter} Newton steps, slowest ${worst.toFixed(1)} ms, max |IPM − SMO| ${worstDiff.toExponential(1)}`);
}

// 7. RBF SVM on moons: γ and C behave as on slide W8 s15–16
{
  const pts = makeMoons(70, 0.2, 7);
  const s = scalerFit(pts.map((p) => [p.x, p.y]));
  const X = pts.map((p) => scalerApply(s, [p.x, p.y]));
  const t = pts.map((p) => (p.c ? 1 : -1));
  const res = {};
  for (const g of [0.1, 5]) {
    for (const C of [0.001, 1000]) {
      const t0 = performance.now();
      const f = fitKernelSvm(X, t, C, rbfKernel(g));
      res[`${g}/${C}`] = f;
      console.log(`   γ=${g} C=${C}: acc ${f.acc.toFixed(3)}, SVs ${f.sv.length}, iter ${f.iter}, ${(performance.now() - t0).toFixed(1)} ms, converged ${f.converged}`);
      assert.ok(f.converged, 'converged');
    }
  }
  assert.ok(res['5/1000'].acc >= res['0.1/0.001'].acc, 'high γ, high C fits training data at least as well');
  assert.ok(res['5/1000'].acc === 1, 'γ=5, C=1000 fits every training point');
  assert.ok(res['0.1/0.001'].sv.length > res['0.1/1000'].sv.length, 'small C → more support vectors');
  // the separable-exponential grid evaluation agrees with the direct decision function
  const f = res['5/1000'];
  const zx = [-1.7, -0.3, 0.4, 1.9];
  const zy = [-1.2, 0, 0.8];
  const gr = rbfGrid(f, 5, zx, zy);
  zy.forEach((y, j) => zx.forEach((x, i) => near(gr[j][i], f.decision([x, y]), 1e-9, 'rbfGrid = decision')));
  ok('RBF moons: high γ/C fits training set perfectly; small C uses more SVs; fast grid = direct decision values');
}

// 8. Geometry helpers
{
  const seg = clipLine([1, 0], -2, 0, 0, 10, 0, 7);
  assert.deepEqual(seg, [[2, 0], [2, 7]]);
  const g = [[-1, -1, -1], [-1, 1, -1], [-1, -1, -1]];
  const segs = zeroContour(g, [0, 1, 2], [0, 1, 2]);
  assert.equal(segs.length, 4, 'closed diamond around the centre');
  ok('clipLine and marching squares');
}
// 9. kernel-lift (slide W8 s13): landmarks −2 and +1, γ = 0.3; x = −1 → (e^−0.3, e^−1.2) ≈ (0.741, 0.301); separable
{
  const phi = (x, l, g) => Math.exp(-g * (x - l) ** 2);
  near(phi(-1, -2, 0.3), 0.741, 5e-4, 'φ₁(−1)');
  near(phi(-1, 1, 0.3), 0.301, 5e-4, 'φ₂(−1)');
  const pts = (g) => [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x) => ({ x: phi(x, -2, g), y: phi(x, 1, g), c: Math.abs(x) <= 2 ? 'A' : 'B' }));
  const at03 = fitLinearSvm(pts(0.3), 1e4);
  assert.equal(at03.violations, 0, 'separable at γ = 0.3');
  const at2 = fitLinearSvm(pts(2), 1e4);
  assert.ok(at2.violations > 0, 'no usable line at γ = 2 (x = −3 and x = −1 collide)');
  // x² lift (slide s9): the line x₂ = 6.5 separates
  [-4, -3, -2, -1, 0, 1, 2, 3, 4].forEach((x) => assert.equal(x * x > 6.5, Math.abs(x) > 2));
  ok(`kernel-lift: φ(−1) = (0.741, 0.301); separable at γ = 0.3 (margin ${at03.width.toFixed(3)}), not at γ = 2; x² > 6.5 ⇔ class B`);
}
console.log('all svm checks passed');
