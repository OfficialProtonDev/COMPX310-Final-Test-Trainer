// Making 1-D data separable: add x² (W8 s9) or similarity-to-landmark features (W8 s12–13).
import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Fb } from '../ui.jsx';
import { fmt, fix, clamp, scale, linspace, linePath } from '../lib/svg.js';
import { fitLinearSvm, clipLine, clipHalf } from './svm-math.js';
import { useWidth, equalAspect } from './b-hooks.js';

const XS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const CLS = (x) => (Math.abs(x) <= 2 ? 'A' : 'B'); // slide s9: squares at ±3, ±4; triangles at −2…2
const L1 = -2;
const L2 = 1;
const phi = (x, l, g) => Math.exp(-g * (x - l) * (x - l));
const PAD = { l: 42, r: 14, t: 14, b: 38 };
const lerp = (a, b, t) => a + (b - a) * t;

const css = `
.kernel-lift { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
.kernel-lift-two { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); align-items: start; }
.kernel-lift-two > .wg-plot { align-content: start; }
@container (min-width: 640px) { .kernel-lift-two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.kernel-lift-cap { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }
.kernel-lift-pt { cursor: pointer; outline: none; }
.kernel-lift-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
.kernel-lift-ctl { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); align-items: end; }
@container (min-width: 640px) { .kernel-lift-ctl { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); } }
.kernel-lift-lg { display: inline-flex; align-items: center; gap: 5px; }
.kernel-lift-pick .seg button { padding: 6px 9px; min-width: 30px; }
`;

/** Class A = triangle (blue), class B = square (red): shape carries the class, not only colour. */
function Mark({ c, x, y, s = 6.5 }) {
  if (c === 'A') {
    return (
      <path
        d={`M${x},${y - s * 1.1}L${x + s},${y + s * 0.75}L${x - s},${y + s * 0.75}Z`}
        fill="var(--cA)"
        stroke="var(--plot-bg)"
        stroke-width="1.2"
      />
    );
  }
  return <rect x={x - s * 0.8} y={y - s * 0.8} width={s * 1.6} height={s * 1.6} fill="var(--cB)" stroke="var(--plot-bg)" stroke-width="1.2" />;
}

function Legend({ extra }) {
  return (
    <div class="wg-legend" aria-hidden="true">
      <span class="kernel-lift-lg">
        <svg width="16" height="14" viewBox="0 0 16 14"><Mark c="A" x={8} y={8} s={5.5} /></svg>class A (triangles)
      </span>
      <span class="kernel-lift-lg">
        <svg width="16" height="14" viewBox="0 0 16 14"><Mark c="B" x={8} y={7} s={5.5} /></svg>class B (squares)
      </span>
      {extra}
    </div>
  );
}

// ------------------------------------------------------------------ mode 1: add x₂ = x₁²
function Lift() {
  const [ref, W] = useWidth(520);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const target = t > 0.5 ? 0 : 1;
  const animateTo = (to) => {
    cancelAnimationFrame(raf.current);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      tRef.current = to;
      setT(to);
      return;
    }
    const from = tRef.current;
    const t0 = performance.now();
    const dur = 750 * Math.abs(to - from) || 1;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const v = from + (to - from) * e;
      tRef.current = v;
      setT(v);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const h = Math.round(clamp((W - PAD.l - PAD.r) * 0.45, 200, 290) + PAD.t + PAD.b);
  const y0 = lerp(-8.5, -1.5, t);
  const y1 = lerp(8.5, 17.5, t);
  const lifted = t > 0.5;
  const fade = clamp((t - 0.8) / 0.2, 0, 1);
  const curve = linspace(-4.3, 4.3, 87).map((x) => [x, x * x]);

  return (
    <div class="stack">
      <div class="wg-row">
        <Btn kind="primary" size="sm" onClick={() => animateTo(target)} aria-pressed={lifted}>
          {lifted ? 'Back to 1-D' : 'Add feature x₂ = x₁²'}
        </Btn>
        <span class="wg-note">{lifted ? 'Each point keeps its x₁ and rises to height x₁².' : 'Nine points on a line: x₁ = −4 … 4.'}</span>
      </div>
      <div ref={ref} class="wg-plot">
        <Plot
          w={W}
          h={h}
          x={[-4.6, 4.6]}
          y={[y0, y1]}
          pad={PAD}
          yTicks={lifted ? [0, 4, 8, 12, 16] : []}
          xTicks={[-4, -2, 0, 2, 4]}
          xLabel="x₁"
          yLabel={lifted ? 'x₂ = x₁²' : undefined}
          label={lifted ? 'Points lifted to (x₁, x₁²); the line x₂ = 6.5 separates the classes' : 'Nine points on a line; class B at both ends'}
        >
          {({ X, Y }) => (
            <g>
              {fade > 0 && (
                <g opacity={fade}>
                  <rect x={X(-4.6)} y={Y(y1)} width={X(4.6) - X(-4.6)} height={Y(6.5) - Y(y1)} fill="var(--c2-soft)" fill-opacity="0.7" />
                  <rect x={X(-4.6)} y={Y(6.5)} width={X(4.6) - X(-4.6)} height={Y(y0) - Y(6.5)} fill="var(--c1-soft)" fill-opacity="0.7" />
                </g>
              )}
              <line x1={X(-4.6)} x2={X(4.6)} y1={Y(0)} y2={Y(0)} stroke="var(--ink-3)" stroke-width="1.3" />
              {t > 0.02 && <path d={linePath(curve, X, Y)} fill="none" stroke="var(--ink-3)" stroke-width="1.2" stroke-dasharray="2 4" opacity={0.8 * t} />}
              {t > 0.02 &&
                XS.map((x) => (
                  <line key={'v' + x} x1={X(x)} x2={X(x)} y1={Y(0)} y2={Y(t * x * x)} stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="1 3" opacity={0.7 * t} />
                ))}
              {fade > 0 && (
                <g opacity={fade}>
                  <line x1={X(-4.6)} x2={X(4.6)} y1={Y(6.5)} y2={Y(6.5)} stroke="var(--ink)" stroke-width="2" stroke-dasharray="8 5" />
                  <text class="kernel-lift-halo" x={X(4.5)} y={Y(6.5) - 7} text-anchor="end" font-size="12" font-weight="700" fill="var(--ink)">
                    x₂ = 6.5
                  </text>
                </g>
              )}
              {XS.map((x) => (
                <Mark key={x} c={CLS(x)} x={X(x)} y={Y(t * x * x)} />
              ))}
            </g>
          )}
        </Plot>
        <Legend />
      </div>
      {lifted ? (
        <Fb kind="good">
          In 2-D a straight line works: x₂ = 6.5 puts every square above (x₁² ≥ 9) and every triangle below (x₁² ≤ 4).
        </Fb>
      ) : (
        <Fb kind="hint">On the x₁ line no single threshold separates them: class B sits at both ends.</Fb>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ mode 2: RBF similarity to two landmarks
function Rbf() {
  const [refA, WA] = useWidth(420);
  const [refB, WB] = useWidth(420);
  const [g, setG] = useState(0.3);
  const [sel, setSel] = useState(-1);
  const pts = XS.map((x) => ({ x, c: CLS(x), f1: phi(x, L1, g), f2: phi(x, L2, g) }));
  const fit = useMemo(() => fitLinearSvm(pts.map((p) => ({ x: p.f1, y: p.f2, c: p.c })), 1e4), [g]);
  const sep = fit && fit.violations === 0;
  const s = pts.find((p) => p.x === sel);

  const hA = Math.round(clamp((WA - PAD.l - PAD.r) * 0.62, 180, 280) + PAD.t + PAD.b);
  const padB = { l: 46, r: 14, t: 14, b: 38 };
  const boxB = equalAspect(WB, padB, { x: [-0.06, 1.1], y: [-0.06, 1.1] }, { minH: 180, maxH: 330 });
  const bell = (l) => linspace(-4.6, 4.6, 185).map((x) => [x, phi(x, l, g)]);

  const geo = (() => {
    if (!fit || !(fit.norm > 0)) return null;
    const rect = [[boxB.x[0], boxB.y[0]], [boxB.x[1], boxB.y[0]], [boxB.x[1], boxB.y[1]], [boxB.x[0], boxB.y[1]]];
    return {
      line: clipLine(fit.w, fit.b, 0, boxB.x[0], boxB.x[1], boxB.y[0], boxB.y[1]),
      regA: clipHalf(rect, fit.w, fit.b, 0),
      regB: clipHalf(rect, [-fit.w[0], -fit.w[1]], -fit.b, 0),
    };
  })();
  const poly = (ps, X, Y) => ps.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const sub = (x, l) => `(${fmt(x)} − ${l < 0 ? `(${fmt(l)})` : fmt(l)})²`;

  return (
    <div class="stack">
      <div class="kernel-lift-ctl">
        <Slider label="γ (width of the bells)" value={g} min={0.05} max={2} step={0.01} onInput={setG} format={(v) => fmt(v, 2)} hint="Slide s13 uses γ = 0.3." />
        <div class="stack-sm kernel-lift-pick">
          <span class="ctl-label">Follow one point</span>
          <Seg label="Point to follow" value={sel} onChange={setSel} options={XS.map((x) => ({ value: x, label: fmt(x) }))} />
        </div>
      </div>
      <div class="kernel-lift-two">
        <div ref={refA} class="wg-plot">
          <div class="kernel-lift-cap">Similarity to each landmark</div>
          <Plot
            w={WA}
            h={hA}
            x={[-4.6, 4.6]}
            y={[-0.12, 1.14]}
            pad={PAD}
            xTicks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]}
            yTicks={[0, 0.5, 1]}
            xLabel="x₁"
            yLabel="similarity"
            label="Two bell curves centred on the landmarks, with the nine points on the x₁ axis"
          >
            {({ X, Y }) => (
              <g>
                <path d={linePath(bell(L1), X, Y)} fill="none" stroke="var(--c3)" stroke-width="2.2" stroke-dasharray="7 4" />
                <path d={linePath(bell(L2), X, Y)} fill="none" stroke="var(--c5)" stroke-width="2.2" stroke-dasharray="2 3" />
                <text class="kernel-lift-halo" x={X(L1)} y={Y(1) - 6} text-anchor="middle" font-size="12" font-weight="700" fill="var(--c3)">
                  φ₁: ℓ₁ = −2
                </text>
                <text class="kernel-lift-halo" x={X(L2)} y={Y(1) - 6} text-anchor="middle" font-size="12" font-weight="700" fill="var(--c5)">
                  φ₂: ℓ₂ = +1
                </text>
                {s && (
                  <g>
                    <line x1={X(s.x)} x2={X(s.x)} y1={Y(0)} y2={Y(Math.max(s.f1, s.f2))} stroke="var(--ink-2)" stroke-dasharray="3 3" />
                    <circle cx={X(s.x)} cy={Y(s.f1)} r="4.5" fill="var(--c3)" stroke="var(--plot-bg)" stroke-width="1.5" />
                    <circle cx={X(s.x)} cy={Y(s.f2)} r="4.5" fill="var(--c5)" stroke="var(--plot-bg)" stroke-width="1.5" />
                    {(() => {
                      // value labels: kept above the axis markers and at least 13 px apart (larger value on top)
                      const floor = Y(0) - 14;
                      let y1 = Math.min(Y(s.f1) + 4, floor);
                      let y2 = Math.min(Y(s.f2) + 4, floor);
                      if (Math.abs(y1 - y2) < 13) {
                        if (s.f1 >= s.f2) y1 = y2 - 13;
                        else y2 = y1 - 13;
                      }
                      const right = s.x < 2.5;
                      return [[s.f1, y1, 'var(--c3)', 'φ₁'], [s.f2, y2, 'var(--c5)', 'φ₂']].map(([v, ly, col, nm]) => (
                        <text key={nm} class="kernel-lift-halo" x={X(s.x) + (right ? 9 : -9)} y={ly} text-anchor={right ? 'start' : 'end'} font-size="11.5" font-weight="700" fill={col}>
                          {nm} = {fix(v, 2)}
                        </text>
                      ));
                    })()}
                  </g>
                )}
                {pts.map((p) => (
                  <g key={p.x} class="kernel-lift-pt" onClick={() => setSel(p.x)}>
                    <circle cx={X(p.x)} cy={Y(0)} r="12" fill="transparent" />
                    {p.x === sel && <circle cx={X(p.x)} cy={Y(0)} r="10" fill="none" stroke="var(--hint)" stroke-width="2.2" />}
                    <Mark c={p.c} x={X(p.x)} y={Y(0)} s={5.5} />
                  </g>
                ))}
              </g>
            )}
          </Plot>
        </div>
        <div ref={refB} class="wg-plot">
          <div class="kernel-lift-cap">New features (φ₁, φ₂)</div>
          <Plot
            w={WB}
            h={boxB.h}
            x={boxB.x}
            y={boxB.y}
            pad={padB}
            xTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            yTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            xLabel="φ₁ = similarity to −2"
            yLabel="φ₂ = similarity to +1"
            label="Each point plotted at its two similarities, with a separating line when one exists"
          >
            {({ X, Y }) => (
              <g>
                {geo && sep && (
                  <g aria-hidden="true">
                    {geo.regA.length > 2 && <polygon points={poly(geo.regA, X, Y)} fill="var(--c1-soft)" fill-opacity="0.6" />}
                    {geo.regB.length > 2 && <polygon points={poly(geo.regB, X, Y)} fill="var(--c2-soft)" fill-opacity="0.6" />}
                    {geo.line && (
                      <line x1={X(geo.line[0][0])} y1={Y(geo.line[0][1])} x2={X(geo.line[1][0])} y2={Y(geo.line[1][1])} stroke="var(--ink)" stroke-width="2" stroke-dasharray="8 5" />
                    )}
                  </g>
                )}
                {pts.map((p) => (
                  <g key={p.x} class="kernel-lift-pt" onClick={() => setSel(p.x)}>
                    <circle cx={X(p.f1)} cy={Y(p.f2)} r="12" fill="transparent" />
                    {p.x === sel && <circle cx={X(p.f1)} cy={Y(p.f2)} r="10" fill="none" stroke="var(--hint)" stroke-width="2.2" />}
                    <Mark c={p.c} x={X(p.f1)} y={Y(p.f2)} s={5.5} />
                  </g>
                ))}
                {s && (
                  <text
                    class="kernel-lift-halo"
                    x={X(s.f1) + (s.f1 > 0.75 ? -13 : 13)}
                    y={Y(s.f2) - 10}
                    text-anchor={s.f1 > 0.75 ? 'end' : 'start'}
                    font-size="12"
                    font-weight="700"
                    fill="var(--ink)"
                  >
                    φ(x = {fmt(s.x)})
                  </text>
                )}
              </g>
            )}
          </Plot>
        </div>
      </div>
      <Legend
        extra={
          <span class="kernel-lift-lg">
            <svg width="22" height="14" viewBox="0 0 22 14"><line x1="1" x2="21" y1="7" y2="7" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 4" /></svg>
            separating line (max margin)
          </span>
        }
      />
      {sep ? (
        <Fb kind={fit.width < 0.05 ? 'hint' : 'good'}>
          {fit.width < 0.05
            ? `Only just separable (margin ${fix(fit.width, 3)}): the bells are so narrow that x = −3 (square) and x = −1 (triangle) get almost the same similarities.`
            : `Linearly separable in (φ₁, φ₂): the dashed line splits triangles from squares (margin ${fix(fit.width, 2)}).`}
        </Fb>
      ) : (
        <Fb kind="bad">
          No usable straight line at γ = {fmt(g, 2)}: with such narrow bells, x = −3 (square) and x = −1 (triangle) get almost the same
          similarities, so they land on top of each other near ({fix(Math.exp(-g), 2)}, 0).
        </Fb>
      )}
      {s && (
        <div class="calc-steps" aria-live="polite">
          <div class="why">φ(x, ℓ) = exp(−γ (x − ℓ)²): 1 at the landmark, falling towards 0 far away. For x = {fmt(s.x)}:</div>
          <div>
            φ₁ = exp(−{fmt(g, 2)} × {sub(s.x, L1)}) = e^(−{fmt(g * (s.x - L1) ** 2, 3)}) ≈ {fix(s.f1, 3)}
          </div>
          <div>
            φ₂ = exp(−{fmt(g, 2)} × {sub(s.x, L2)}) = e^(−{fmt(g * (s.x - L2) ** 2, 3)}) ≈ {fix(s.f2, 3)}
          </div>
          <div class="why">
            So x = {fmt(s.x)} becomes the point ({fix(s.f1, 2)}, {fix(s.f2, 2)}) in the new feature space.
          </div>
        </div>
      )}
    </div>
  );
}

export default function KernelLift() {
  const [mode, setMode] = useState('lift');
  return (
    <WidgetFrame
      title="Making 1-D data separable"
      lead={
        mode === 'lift'
          ? 'Add the feature x₂ = x₁² and watch the points rise until a straight line separates them.'
          : 'Replace x by its similarity to two landmarks (−2 and +1). Change γ and follow one point into the new feature space.'
      }
      actions={
        <Seg
          label="Feature trick"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'lift', label: 'Add x² feature' },
            { value: 'rbf', label: 'RBF similarity' },
          ]}
        />
      }
      foot={
        <span>
          Adding features (polynomial like x², or similarity to landmarks) can make data linearly separable. The kernel trick gets the
          same effect inside the SVM without building the features: SVC(kernel="poly") or SVC(kernel="rbf").
        </span>
      }
    >
      <style>{css}</style>
      <div class="kernel-lift">{mode === 'lift' ? <Lift /> : <Rbf />}</div>
    </WidgetFrame>
  );
}
