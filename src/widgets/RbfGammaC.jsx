// RBF-kernel SVM on moons: how γ and C change the boundary (W8 s14–16).
import { useState, useMemo, useEffect } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Btn, Fb, Readout } from '../ui.jsx';
import { fmt, pct, scale } from '../lib/svg.js';
import { fitKernelSvm, rbfKernel, rbfGrid, makeMoons, scalerFit, scalerApply, zeroContour } from './svm-math.js';
import { useWidth, equalAspect } from './b-hooks.js';

const PAD = { l: 40, r: 12, t: 12, b: 36 };
const DOM = { x: [-1.5, 2.5], y: [-1, 1.5] }; // as on slide s15
const COMBOS = [
  { g: 0.1, C: 0.001 },
  { g: 0.1, C: 1000 },
  { g: 5, C: 0.001 },
  { g: 5, C: 1000 },
];

const css = `
.rbf-gamma-c { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
.rbf-gamma-c-split { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@container (min-width: 700px) { .rbf-gamma-c-split { grid-template-columns: minmax(0, 1fr) minmax(240px, 280px); } }
.rbf-gamma-c-combos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.rbf-gamma-c-combos .btn { white-space: normal; font-variant-numeric: tabular-nums; }
.rbf-gamma-c-lg { display: inline-flex; align-items: center; gap: 5px; }
`;

// data: 70 training points and 400 held-out points from the same distribution (fixed seeds)
const TRAIN = makeMoons(70, 0.2, 42).map((p) => ({ ...p, c: p.c ? 'B' : 'A' }));
const TEST = makeMoons(400, 0.2, 1042).map((p) => ({ ...p, c: p.c ? 'B' : 'A' }));
const SCALER = scalerFit(TRAIN.map((p) => [p.x, p.y])); // the slide's Pipeline(StandardScaler(), SVC(...))
const XT = TRAIN.map((p) => scalerApply(SCALER, [p.x, p.y]));
const TT = TRAIN.map((p) => (p.c === 'A' ? 1 : -1));
const XH = TEST.map((p) => scalerApply(SCALER, [p.x, p.y]));

function Mark({ c, x, y, s = 4.6 }) {
  if (c === 'A') return <rect x={x - s} y={y - s} width={2 * s} height={2 * s} fill="var(--cA)" stroke="var(--plot-bg)" stroke-width="1" />;
  return <path d={`M${x},${y - s * 1.25}L${x + s * 1.15},${y + s * 0.85}L${x - s * 1.15},${y + s * 0.85}Z`} fill="var(--cB)" stroke="var(--plot-bg)" stroke-width="1" />;
}

export default function RbfGammaC() {
  const [lg, setLg] = useState(0); // log10 γ
  const [lc, setLc] = useState(0); // log10 C
  const [fp, setFp] = useState({ lg: 0, lc: 0 }); // parameters of the current fit (debounced)
  const [ref, W] = useWidth(560);

  useEffect(() => {
    if (fp.lg === lg && fp.lc === lc) return undefined;
    const id = setTimeout(() => setFp({ lg, lc }), 120);
    return () => clearTimeout(id);
  }, [lg, lc]);

  const g = 10 ** fp.lg;
  const C = 10 ** fp.lc;
  const fit = useMemo(() => {
    const f = fitKernelSvm(XT, TT, C, rbfKernel(g));
    const held = XH.filter((p, i) => f.decision(p) * (TEST[i].c === 'A' ? 1 : -1) > 0).length / XH.length;
    return { ...f, held };
  }, [fp]);

  const box = equalAspect(W, PAD, DOM, { minH: 180, maxH: 380 });
  const X = scale(box.x[0], box.x[1], PAD.l, W - PAD.r);
  const Y = scale(box.y[0], box.y[1], box.h - PAD.b, PAD.t);

  // decision values on a vertex grid (~5 px cells) → region fill (row runs) + zero contour
  const regions = useMemo(() => {
    const iw = W - PAD.l - PAD.r;
    const ih = box.h - PAD.t - PAD.b;
    const nx = Math.max(24, Math.round(iw / 5));
    const ny = Math.max(16, Math.round(ih / 5));
    const xs = Array.from({ length: nx + 1 }, (_, i) => box.x[0] + ((box.x[1] - box.x[0]) * i) / nx);
    const ys = Array.from({ length: ny + 1 }, (_, j) => box.y[0] + ((box.y[1] - box.y[0]) * j) / ny);
    const gv = rbfGrid(fit, g, xs.map((x) => (x - SCALER.mu[0]) / SCALER.sd[0]), ys.map((y) => (y - SCALER.mu[1]) / SCALER.sd[1]));
    let dA = '';
    let dB = '';
    // cell edges snapped to whole pixels so neighbouring rows and runs tile with no hairline gaps
    const px = xs.map((x) => Math.round(X(x)));
    const py = ys.map((y) => Math.round(Y(y)));
    for (let j = 0; j < ny; j++) {
      const top = py[j + 1];
      const hgt = py[j] - py[j + 1];
      let start = 0;
      let cur = null;
      for (let i = 0; i <= nx; i++) {
        const cls = i < nx ? (gv[j][i] + gv[j][i + 1] + gv[j + 1][i] + gv[j + 1][i + 1] >= 0 ? 'A' : 'B') : null;
        if (cls !== cur) {
          if (cur) {
            const seg = `M${px[start]},${top}h${px[i] - px[start]}v${hgt}h${px[start] - px[i]}z`;
            if (cur === 'A') dA += seg;
            else dB += seg;
          }
          cur = cls;
          start = i;
        }
      }
    }
    const segs = zeroContour(gv, xs, ys);
    let dLine = '';
    let len = 0;
    for (const [x1, y1, x2, y2] of segs) {
      const a = [X(x1), Y(y1)];
      const b = [X(x2), Y(y2)];
      dLine += `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
      len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return { dA, dB, dLine, len: len / iw };
  }, [fit, W, box.h]);

  const verdict =
    fit.acc < 0.9
      ? { kind: 'hint', head: 'Smooth / underfit-ish', text: 'The boundary is too simple and misses training points. Increase γ or C.' }
      : fit.acc - fit.held >= 0.05 || regions.len > 2.6
        ? { kind: 'bad', head: 'Wiggly / overfit-ish', text: 'The boundary bends around single training points; held-out accuracy drops. Decrease γ or C.' }
        : { kind: 'good', head: 'About right', text: 'Smooth enough to generalise, flexible enough to follow the moons.' };
  const pending = fp.lg !== lg || fp.lc !== lc;
  const on = (k) => Math.abs(lg - Math.log10(k.g)) < 1e-9 && Math.abs(lc - Math.log10(k.C)) < 1e-9;

  return (
    <WidgetFrame
      title="RBF-kernel SVM: γ and C"
      lead="Move γ and C (or try the four combinations from slide 15) and watch the boundary go from too smooth to too wiggly."
      foot={
        <span>
          Small γ → wide bells → smooth boundary; large γ → narrow bells → wiggly. C acts the same way (small C tolerates training
          errors → smooth). Underfitting → increase γ or C; overfitting → decrease γ or C.
        </span>
      }
    >
      <style>{css}</style>
      <div class="rbf-gamma-c">
        <div class="rbf-gamma-c-split">
          <div class="wg-plot" ref={ref}>
            <Plot
              w={W}
              h={box.h}
              x={box.x}
              y={box.y}
              pad={PAD}
              xLabel="x₁"
              yLabel="x₂"
              label={`Moons data with the RBF SVM decision regions for gamma ${fmt(g, 2)} and C ${fmt(C, 3)}`}
            >
              {() => (
                <g>
                  <g aria-hidden="true" shape-rendering="crispEdges">
                    <path d={regions.dA} fill="var(--c1-soft)" />
                    <path d={regions.dB} fill="var(--c2-soft)" />
                  </g>
                  <path d={regions.dLine} fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
                  {fit.sv.map((i) => (
                    <circle key={'r' + i} cx={X(TRAIN[i].x)} cy={Y(TRAIN[i].y)} r="7.5" fill="none" stroke="var(--hint)" stroke-width="1.6" />
                  ))}
                  {TRAIN.map((p, i) => (
                    <Mark key={i} c={p.c} x={X(p.x)} y={Y(p.y)} />
                  ))}
                </g>
              )}
            </Plot>
            <div class="wg-legend" aria-hidden="true">
              <span class="rbf-gamma-c-lg">
                <svg width="14" height="14" viewBox="0 0 14 14"><Mark c="A" x={7} y={7} s={4.5} /></svg>class A
              </span>
              <span class="rbf-gamma-c-lg">
                <svg width="14" height="14" viewBox="0 0 14 14"><Mark c="B" x={7} y={8} s={4.5} /></svg>class B
              </span>
              <span class="rbf-gamma-c-lg">
                <svg width="16" height="14" viewBox="0 0 16 14"><circle cx="8" cy="7" r="5.5" fill="none" stroke="var(--hint)" stroke-width="1.6" /></svg>support vector
              </span>
              <span class="rbf-gamma-c-lg">
                <svg width="20" height="14" viewBox="0 0 20 14"><line x1="1" x2="19" y1="7" y2="7" stroke="var(--ink)" stroke-width="2" /></svg>boundary
              </span>
            </div>
          </div>
          <div class="wg-controls">
            <Slider
              label="γ (gamma)"
              value={lg}
              min={-1}
              max={1}
              step={0.02}
              onInput={setLg}
              format={(v) => fmt(10 ** v, 10 ** v < 1 ? 2 : 1)}
              hint="Log scale, 0.1 to 10. Large γ = narrow bells."
            />
            <Slider
              label="C (cost of training errors)"
              value={lc}
              min={-3}
              max={3}
              step={0.05}
              onInput={setLc}
              format={(v) => fmt(10 ** v, 10 ** v < 0.1 ? 3 : 10 ** v < 10 ? 2 : 0)}
              hint="Log scale, 0.001 to 1000."
            />
            <div class="stack-sm">
              <span class="ctl-label">Slide 15 combinations</span>
              <div class="rbf-gamma-c-combos">
                {COMBOS.map((k) => (
                  <Btn
                    key={`${k.g}-${k.C}`}
                    size="sm"
                    kind={on(k) ? 'primary' : undefined}
                    aria-pressed={on(k)}
                    onClick={() => {
                      const p = { lg: Math.log10(k.g), lc: Math.log10(k.C) };
                      setLg(p.lg);
                      setLc(p.lc);
                      setFp(p);
                    }}
                  >
                    γ {fmt(k.g)}, C {fmt(k.C, 3)}
                  </Btn>
                ))}
              </div>
            </div>
            <div class="readouts" aria-live="polite">
              <Readout label="Support vectors" value={fit.sv.length} sub={`of ${TRAIN.length} points`} />
              <Readout label="Train accuracy" value={pct(fit.acc, 0)} sub="70 points shown" />
              <Readout label="Held-out accuracy" value={pct(fit.held, 0)} sub="400 new points" tone={fit.acc - fit.held >= 0.05 ? 'bad' : undefined} />
            </div>
            <Fb kind={verdict.kind}>
              <b>{verdict.head}.</b> {verdict.text}
              {pending && <span class="faint"> (updating…)</span>}
            </Fb>
            <p class="wg-note">Features are standardised first, as in the slide's Pipeline(StandardScaler(), SVC(kernel="rbf")).</p>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
