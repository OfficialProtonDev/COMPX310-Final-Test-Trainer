// Bias and variance: the bull's-eye picture and polynomial fits of growing degree (W3 s17-27, W4 s2-5; 2025 test Q20).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Fb, Readout } from '../ui.jsx';
import { fmt, fix, linspace, linePath, clamp } from '../lib/svg.js';
import { shots, level, makePolyData, errorCurve, polyEval, trueF, X_RANGE } from './bias-variance-math.js';
import { useWidth, marker } from './d-shared.js';

const css = `
.bias-variance-target { max-width: 360px; width: 100%; }
.bias-variance-quad { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.bias-variance-quad .btn { white-space: normal; line-height: 1.25; text-align: center; }
.bias-variance-top { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 760px) { .bias-variance-top { grid-template-columns: minmax(240px, 360px) minmax(0, 1fr); } }
.bias-variance-plots { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: start; }
.bias-variance-cap { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.bias-variance-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
`;

const QUADS = [
  { b: 0.05, v: 0.08, label: 'Low bias, low variance' },
  { b: 0.05, v: 0.75, label: 'Low bias, high variance' },
  { b: 0.75, v: 0.08, label: 'High bias, low variance' },
  { b: 0.75, v: 0.75, label: 'High bias, high variance' },
];

const MEANING = {
  'low-low': 'Shots cluster on the centre: the ideal model.',
  'low-high': 'Right on average but scattered: the model changes a lot with the training sample (overfitting).',
  'high-low': 'Tightly grouped but consistently off-centre: a wrong assumption pulls every prediction the same way (underfitting). This is the 2025 test Q20 case.',
  'high-high': 'Off-centre and scattered: the worst of both.',
};

// ---------------------------------------------------------------- bull's-eye
function BullsEye() {
  const [bias, setBias] = useState(0.75);
  const [variance, setVariance] = useState(0.08);
  const [ref, width] = useWidth(320);
  const S = Math.max(240, Math.min(width, 360));
  const c = S / 2;
  const R = S / 2 - 8; // target radius in px
  const sh = shots(bias, variance);
  const px = ([x, y]) => [c + x * R, c - y * R];
  const [mx, my] = px(sh.mean);
  const lb = level(bias);
  const lv = level(variance);
  const key = `${lb}-${lv}`;
  return (
    <div class="wg-split">
      <div class="wg-controls">
        <Slider label="Bias (how far off-centre on average)" value={bias} min={0} max={1} step={0.05} onInput={setBias} format={(v) => fmt(v, 2)} />
        <Slider label="Variance (how scattered)" value={variance} min={0} max={1} step={0.05} onInput={setVariance} format={(v) => fmt(v, 2)} />
        <div class="bias-variance-quad" role="group" aria-label="The four cases on the slide">
          {QUADS.map((q) => (
            <Btn key={q.label} size="sm" kind={level(q.b) === lb && level(q.v) === lv ? 'primary' : ''} onClick={() => { setBias(q.b); setVariance(q.v); }}>
              {q.label}
            </Btn>
          ))}
        </div>
        <Readout label="This is" value={`${lb === 'low' ? 'Low' : 'High'} bias, ${lv} variance`} tone={key === 'low-low' ? 'good' : key === 'high-high' ? 'bad' : 'blue'} />
        <Fb kind={key === 'high-low' ? 'hint' : 'info'}>{MEANING[key]}</Fb>
      </div>
      <div class="wg-plot">
        <div class="bias-variance-target" ref={ref}>
          <svg class="plot" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`Target with 15 shots: ${lb} bias, ${lv} variance`}>
            <circle cx={c} cy={c} r={R} fill="var(--paper)" stroke="var(--ink-2)" stroke-width="2" />
            <circle cx={c} cy={c} r={R * 0.72} fill="var(--c1-soft)" stroke="var(--ink-2)" stroke-width="2" />
            <circle cx={c} cy={c} r={R * 0.45} fill="var(--paper)" stroke="var(--ink-2)" stroke-width="2" />
            <circle cx={c} cy={c} r={R * 0.16} fill="var(--cB)" stroke="var(--ink-2)" stroke-width="2" />
            <circle cx={mx} cy={my} r={Math.max(6, 2 * sh.sd * R)} fill="none" stroke="var(--hint)" stroke-width="1.6" stroke-dasharray="5 4" />
            {sh.off > 0.02 && <line x1={c} y1={c} x2={mx} y2={my} stroke="var(--hint)" stroke-width="2.2" stroke-dasharray="6 4" />}
            {sh.pts.map((p, i) => {
              const [x, y] = px(p);
              return <circle key={i} cx={x} cy={y} r="5" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.2" />;
            })}
            <path d={marker('cross', mx, my, 7)} stroke="var(--hint)" stroke-width="3" fill="none" />
            {sh.off > 0.15 && (
              <text class="lbl-strong bias-variance-halo" x={(c + mx) / 2 + 8} y={(c + my) / 2 + 4}>
                bias
              </text>
            )}
          </svg>
        </div>
        <div class="wg-legend">
          <span>● 15 models, each trained on a different sample</span>
          <span>× their average</span>
          <span>dashed ring = spread (variance)</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- complexity
const DATA = makePolyData();
const CURVE = errorCurve(DATA, 15);
const BEST = CURVE.reduce((a, b) => (b.val < a.val ? b : a));

function status(d) {
  if (d === 1) return { kind: 'bad', t: 'Underfitting (high bias)', s: 'A straight line cannot bend: training and validation errors are both high and close together. Use a more complex model or better features.' };
  if (d <= 3) return { kind: 'good', t: 'Good fit', s: `Validation error is near its lowest (best: degree ${BEST.d}). The curve follows the quadratic trend, not the noise.` };
  if (d <= 8) return { kind: 'hint', t: 'More complex than needed', s: 'Training error keeps falling, but validation error starts to rise: the gap is opening.' };
  return { kind: 'bad', t: 'Overfitting (high variance)', s: 'The curve chases the noise and swings between points: low training error, much higher validation error. Use more data, a simpler or a regularised model.' };
}

function FitPlot({ deg }) {
  const [ref, width] = useWidth(320);
  const clip = 'bv-fit-' + useId();
  const W = Math.max(280, Math.min(width, 480));
  const H = Math.round(clamp(W * 0.72, 220, 320));
  const w = CURVE[deg - 1].w;
  const xs = linspace(X_RANGE[0], X_RANGE[1], 241);
  return (
    <div ref={ref}>
      <div class="bias-variance-cap">Degree-{deg} fit</div>
      <Plot w={W} h={H} x={X_RANGE} y={[-1, 12]} pad={{ l: 34, r: 10, t: 10, b: 34 }} xTicks={[-3, -2, -1, 0, 1, 2, 3]} yTicks={[0, 2, 4, 6, 8, 10, 12]} xLabel="x" yLabel="y" label={`Polynomial of degree ${deg} fitted to 20 training points`}>
        {({ X, Y, w: pw, h: ph, pad }) => (
          <g>
            <defs>
              <clipPath id={clip}>
                <rect x={pad.l} y={pad.t} width={pw - pad.l - pad.r} height={ph - pad.t - pad.b} />
              </clipPath>
            </defs>
            <g clip-path={`url(#${clip})`}>
              <path d={linePath(xs.map((x) => [x, trueF(x)]), X, Y)} fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="5 4" />
              {DATA.val.map(([x, y], i) => (
                <path key={'v' + i} d={marker('square', X(x), Y(y), 3.6)} fill="none" stroke="var(--c4)" stroke-width="1.4" />
              ))}
              <path d={linePath(xs.map((x) => [x, clamp(polyEval(w, x), -50, 60)]), X, Y)} fill="none" stroke="var(--c2)" stroke-width="2.6" />
              {DATA.train.map(([x, y], i) => (
                <circle key={'t' + i} cx={X(x)} cy={Y(y)} r="4.2" fill="var(--c1)" stroke="var(--paper)" stroke-width="1" />
              ))}
            </g>
          </g>
        )}
      </Plot>
      <div class="wg-legend">
        <span>● training (20)</span>
        <span>□ validation (40)</span>
        <span>— fitted curve</span>
        <span>- - true 0.5x² + x + 2</span>
      </div>
    </div>
  );
}

function ErrorPlot({ deg }) {
  const [ref, width] = useWidth(320);
  const W = Math.max(280, Math.min(width, 480));
  const H = Math.round(clamp(W * 0.72, 220, 320));
  const L = (v) => Math.log10(v);
  const yT = [0.5, 1, 2, 5, 10, 20];
  const tr = CURVE.map((e) => [e.d, L(e.train)]);
  const va = CURVE.map((e) => [e.d, L(e.val)]);
  return (
    <div ref={ref}>
      <div class="bias-variance-cap">Error against degree (log scale)</div>
      <Plot w={W} h={H} x={[0.5, 15.5]} y={[L(0.4), L(25)]} pad={{ l: 38, r: 10, t: 10, b: 34 }} xTicks={[1, 3, 5, 7, 9, 11, 13, 15]} yTicks={yT.map(L)} yFmt={(v) => fmt(10 ** v, 1)} xLabel="polynomial degree" yLabel="RMSE" label="Training and validation error for degrees 1 to 15">
        {({ X, Y, h, pad }) => (
          <g>
            <rect x={X(0.5)} y={pad.t} width={X(1.5) - X(0.5)} height={h - pad.t - pad.b} fill="var(--marker-soft)" opacity="0.7" />
            <rect x={X(1.5)} y={pad.t} width={X(3.5) - X(1.5)} height={h - pad.t - pad.b} fill="var(--tick-soft)" opacity="0.8" />
            <rect x={X(8.5)} y={pad.t} width={X(15.5) - X(8.5)} height={h - pad.t - pad.b} fill="var(--marker-soft)" opacity="0.7" />
            <text class="lbl bias-variance-halo" x={X(2.5)} y={pad.t + 14} text-anchor="middle">
              good
            </text>
            <text class="lbl bias-variance-halo" x={X(12)} y={pad.t + 14} text-anchor="middle">
              overfit
            </text>
            <text class="lbl bias-variance-halo" transform={`translate(${X(1) + 4} ${h - pad.b - 8}) rotate(-90)`} text-anchor="start">
              underfit
            </text>
            <line x1={X(deg)} x2={X(deg)} y1={pad.t} y2={h - pad.b} stroke="var(--ink)" stroke-width="1.5" />
            <path d={linePath(tr, X, Y)} fill="none" stroke="var(--c1)" stroke-width="2.2" />
            <path d={linePath(va, X, Y)} fill="none" stroke="var(--c2)" stroke-width="2.2" stroke-dasharray="6 4" />
            {CURVE.map((e) => (
              <g key={e.d}>
                <circle cx={X(e.d)} cy={Y(L(e.train))} r={e.d === deg ? 5.5 : 3.2} fill="var(--c1)" stroke="var(--paper)" stroke-width="1" />
                <path d={marker('square', X(e.d), Y(L(e.val)), e.d === deg ? 5.2 : 3.2)} fill="var(--c2)" stroke="var(--paper)" stroke-width="1" />
              </g>
            ))}
          </g>
        )}
      </Plot>
      <div class="wg-legend">
        <span>● training error</span>
        <span>■ validation error (held-out points)</span>
      </div>
    </div>
  );
}

function Complexity() {
  const [deg, setDeg] = useState(2);
  const e = CURVE[deg - 1];
  const st = status(deg);
  return (
    <div class="stack">
      <div class="bias-variance-top">
        <div class="stack-sm">
          <Slider label="Polynomial degree (model complexity)" value={deg} min={1} max={15} step={1} onInput={setDeg} format={(v) => String(v)} />
          <div class="readouts">
            <Readout label="Training RMSE" value={fix(e.train, 2)} tone="blue" />
            <Readout label="Validation RMSE" value={fix(e.val, 2)} tone={deg <= 3 ? 'good' : deg >= 9 || deg === 1 ? 'bad' : undefined} />
          </div>
        </div>
        <Fb kind={st.kind}>
          <b>{st.t}.</b> {st.s}
        </Fb>
      </div>
      <div class="bias-variance-plots">
        <FitPlot deg={deg} />
        <ErrorPlot deg={deg} />
      </div>
    </div>
  );
}

export default function BiasVariance({ panel: panel0 = 'eye' }) {
  const [panel, setPanel] = useState(panel0);
  return (
    <WidgetFrame
      title="Bias, variance and model complexity"
      lead={
        panel === 'eye'
          ? 'Set bias and variance and read the bull’s-eye: each shot is the prediction of a model trained on a different sample.'
          : 'Raise the polynomial degree and watch training error fall while validation error turns back up.'
      }
      foot={
        <span>
          High bias = underfitting: errors high on training and validation data alike; use a more complex model or better features.
          High variance = overfitting: low training error, big gap to validation; use more data or a simpler or regularised model.
        </span>
      }
    >
      <style>{css}</style>
      <Seg
        label="Panel"
        value={panel}
        onChange={setPanel}
        options={[
          { value: 'eye', label: 'Bull’s-eye' },
          { value: 'fit', label: 'Model complexity' },
        ]}
      />
      {panel === 'eye' ? <BullsEye /> : <Complexity />}
    </WidgetFrame>
  );
}
