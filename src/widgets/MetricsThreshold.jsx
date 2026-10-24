// Precision, recall and the decision threshold; confusion matrix, PR and ROC curves (W4 s11-24; 2024 test Q10).
import { useState, useMemo, useRef } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Fb, Readout, Num } from '../ui.jsx';
import { scale, svgPoint, clamp, fmt, fix } from '../lib/svg.js';
import { DATA24, DATA_SLIDE, SLIDE_ARROWS, confusion, metrics, sweep, auc } from './metrics-threshold-math.js';
import { useWidth, marker, commas } from './d-shared.js';

const DATASETS = {
  d24: { data: DATA24, dom: [-4.6, 4.6], step: 0.1, t0: 0, ticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4] },
  slide: { data: DATA_SLIDE, dom: [-6, 6], step: 1, t0: 0, ticks: [-6, -4, -2, 0, 2, 4, 6] },
};

const PRESETS = {
  q10: { label: '2024 test Q10', c: { tn: 1400, fp: 600, fn: 200, tp: 600 } },
  s13: { label: 'Slide W4 s13', c: { tn: 5, fp: 1, fn: 2, tp: 3 } },
  mnist: { label: '5-detector (W4 s11)', c: { tn: 52992, fp: 1587, fn: 1074, tp: 4347 } },
};

const css = `
.metrics-threshold-ctl { max-width: 560px; }
.metrics-threshold-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); align-items: start; }
.metrics-threshold-cm { border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.metrics-threshold-cm th, .metrics-threshold-cm td { border: 1px solid var(--rule); padding: 5px 8px; text-align: center; }
.metrics-threshold-cm th { background: var(--paper-2); font-size: 12px; font-weight: 700; color: var(--ink-2); }
.metrics-threshold-cm td { min-width: 72px; background: var(--paper); }
.metrics-threshold-cm td .metrics-threshold-k { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: var(--ink-2); }
.metrics-threshold-cm td .metrics-threshold-v { font-family: var(--font-display); font-weight: 700; font-size: 17px; }
.metrics-threshold-cm td.metrics-threshold-ok .metrics-threshold-v { color: var(--tick); }
.metrics-threshold-cm td.metrics-threshold-err .metrics-threshold-v { color: var(--marker); }
.metrics-threshold-cm td.metrics-threshold-ok { background: var(--tick-soft); }
.metrics-threshold-cm td.metrics-threshold-err { background: var(--marker-soft); }
.metrics-threshold-cap { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.metrics-threshold-line { cursor: ew-resize; }
.metrics-threshold-dot { color: var(--hint); font-weight: 700; }
.metrics-threshold-steps b { color: var(--ink); }
`;

const r3 = (v) => (Number.isFinite(v) ? fmt(v, 3) : 'undefined (0/0)');

/** The 2×2 confusion matrix in sklearn layout: rows = actual, columns = predicted. */
function CM({ c, edit }) {
  const cell = (k, label, good) => (
    <td class={good ? 'metrics-threshold-ok' : 'metrics-threshold-err'}>
      <span class="metrics-threshold-k">{label}</span>
      {edit ? (
        <Num value={c[k]} min={0} step={1} width={82} label={label} onChange={(n) => edit({ ...c, [k]: Math.max(0, Math.round(n)) })} />
      ) : (
        <span class="metrics-threshold-v">{commas(c[k])}</span>
      )}
    </td>
  );
  return (
    <div>
      <div class="metrics-threshold-cap">Confusion matrix</div>
      <table class="metrics-threshold-cm" aria-label="Confusion matrix: rows are actual classes, columns are predicted classes">
        <thead>
          <tr>
            <th />
            <th>Predicted −</th>
            <th>Predicted +</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Actual −</th>
            {cell('tn', 'TN', true)}
            {cell('fp', 'FP', false)}
          </tr>
          <tr>
            <th>Actual +</th>
            {cell('fn', 'FN', false)}
            {cell('tp', 'TP', true)}
          </tr>
        </tbody>
      </table>
      <div class="faint small">sklearn layout [[TN, FP], [FN, TP]]</div>
    </div>
  );
}

/** Small square plot for the PR or ROC curve. */
function Curve({ kind, pts, cur, aucV }) {
  const [ref, width] = useWidth(280);
  const W = Math.max(240, Math.min(width, 330));
  const H = Math.round(W * 0.82);
  const roc = kind === 'roc';
  const xy = (p) => (roc ? [p.fpr, p.tpr] : [p.recall, p.precision]);
  // sweep() runs from the highest threshold to the lowest, so the points are already in drawing order
  const line = pts.filter((p) => Number.isFinite(xy(p)[1])).map(xy);
  const c = cur && Number.isFinite(cur[1]) ? cur : null;
  return (
    <div ref={ref}>
      <div class="metrics-threshold-cap">{roc ? 'ROC curve' : 'Precision–recall curve'}</div>
      <Plot
        w={W}
        h={H}
        x={[0, 1]}
        y={[0, 1.04]}
        pad={{ l: 40, r: 12, t: 10, b: 36 }}
        xTicks={[0, 0.25, 0.5, 0.75, 1]}
        yTicks={[0, 0.25, 0.5, 0.75, 1]}
        xFmt={(v) => fmt(v, 2)}
        xLabel={roc ? 'FPR = FP/(FP+TN)' : 'Recall'}
        yLabel={roc ? 'TPR = recall' : 'Precision'}
        label={roc ? `ROC curve, AUC ${fmt(aucV, 3)}` : 'Precision against recall over all thresholds'}
      >
        {({ X, Y }) => (
          <g>
            {roc && <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="var(--ink-3)" stroke-dasharray="4 4" />}
            {roc && (
              <text class="lbl" x={X(0.62)} y={Y(0.5)} transform={`rotate(${-Math.atan2(Y(0) - Y(1), X(1) - X(0)) * (180 / Math.PI)} ${X(0.62)} ${Y(0.5)})`} text-anchor="middle">
                random (AUC 0.5)
              </text>
            )}
            <path d={line.map(([a, b], i) => (i ? 'L' : 'M') + X(a).toFixed(1) + ',' + Y(b).toFixed(1)).join('')} fill="none" stroke="var(--c1)" stroke-width="2.2" />
            {roc && (
              <text class="lbl-strong" x={X(0.96)} y={Y(0.08)} text-anchor="end">
                AUC = {fmt(aucV, 3)}
              </text>
            )}
            {c && <circle cx={X(c[0])} cy={Y(c[1])} r="6.5" fill="var(--hint)" stroke="var(--paper)" stroke-width="1.5" />}
          </g>
        )}
      </Plot>
    </div>
  );
}

/** Scores on a number line: circles = actual positive, squares = actual negative; filled = predicted positive. */
function ScoreLine({ ds, t, setT }) {
  const [ref, width] = useWidth(360);
  const svgRef = useRef(null);
  const drag = useRef(false);
  const W = Math.max(300, Math.min(width, 860));
  const H = 158;
  const pad = { l: 12, r: 12, t: 24, b: 40 };
  const X = scale(ds.dom[0], ds.dom[1], pad.l, W - pad.r);
  const yPos = 58;
  const yNeg = 98;
  const yAxis = 118;
  const xt = X(t);
  const snap = (v) => clamp(Math.round(v / ds.step) * ds.step, ds.dom[0], ds.dom[1]);
  const move = (e) => setT(+snap(X.invert(svgPoint(svgRef.current, e).x)).toFixed(2));
  const c = confusion(ds.data, t);
  const right = t < (ds.dom[0] + ds.dom[1]) / 2; // put row labels on the side away from the threshold
  const lx = right ? W - pad.r : pad.l;
  const la = right ? 'end' : 'start';
  return (
    <div ref={ref}>
      <svg
        ref={svgRef}
        class="plot metrics-threshold-line"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Scores on a line with the threshold at ${fmt(t, 2)}: ${c.tp} true positives, ${c.fp} false positives, ${c.fn} false negatives, ${c.tn} true negatives`}
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => drag.current && move(e)}
        onPointerUp={() => (drag.current = false)}
      >
        <rect x={xt} y={pad.t - 6} width={Math.max(0, W - pad.r - xt)} height={yAxis - pad.t + 6} fill="var(--biro-soft)" opacity="0.75" />
        <text class="lbl" x={pad.l} y={14}>
          ← predicted negative
        </text>
        <text class="lbl" x={W - pad.r} y={14} text-anchor="end">
          predicted positive →
        </text>
        <line x1={pad.l} x2={W - pad.r} y1={yAxis} y2={yAxis} stroke="var(--axis)" />
        {ds.ticks.map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={yAxis} y2={yAxis + 4} stroke="var(--axis)" />
            <text class="lbl" x={X(v)} y={yAxis + 16} text-anchor="middle">
              {fmt(v)}
            </text>
          </g>
        ))}
        <text class="lbl" x={(pad.l + W - pad.r) / 2} y={H - 5} text-anchor="middle" font-weight="700">
          decision score (classifier output)
        </text>
        <text class="lbl" x={lx} y={yPos - 13} text-anchor={la}>
          {W > 520 ? 'actual 5 (positive)' : 'actual 5'}
        </text>
        <text class="lbl" x={lx} y={yNeg - 13} text-anchor={la}>
          {W > 520 ? 'actual not-5 (negative)' : 'not 5'}
        </text>
        {ds.data.map((d, i) => {
          const pos = d.s > t;
          const y = d.y ? yPos : yNeg;
          const col = d.y ? 'var(--cA)' : 'var(--cB)';
          return <path key={i} d={marker(d.y ? 'circle' : 'square', X(d.s), y, 6)} fill={pos ? col : 'var(--plot-bg)'} stroke={col} stroke-width="2" />;
        })}
        <line x1={xt} x2={xt} y1={pad.t - 6} y2={yAxis + 6} stroke="var(--ink)" stroke-width="2" />
        {xt - pad.l > 50 && (
          <g>
            <text class="lbl-strong" x={xt - 6} y={yPos - 13} text-anchor="end">
              FN {c.fn}
            </text>
            <text class="lbl-strong" x={xt - 6} y={yNeg - 13} text-anchor="end">
              TN {c.tn}
            </text>
          </g>
        )}
        {W - pad.r - xt > 50 && (
          <g>
            <text class="lbl-strong" x={xt + 6} y={yPos - 13}>
              TP {c.tp}
            </text>
            <text class="lbl-strong" x={xt + 6} y={yNeg - 13}>
              FP {c.fp}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function ThresholdMode() {
  const [which, setWhich] = useState('d24');
  const ds = DATASETS[which];
  const [t, setT] = useState(ds.t0);
  const c = confusion(ds.data, t);
  const m = metrics(c);
  const ref = metrics(confusion(ds.data, 0));
  const pts = useMemo(() => sweep(ds.data), [which]);
  const aucV = useMemo(() => auc(ds.data), [which]);
  const pick = (k) => {
    setWhich(k);
    setT(DATASETS[k].t0);
  };
  const arrow = which === 'slide' ? SLIDE_ARROWS.indexOf(t) : -1;
  let insight;
  if (arrow >= 0) {
    insight = `Slide s17, ${['left', 'middle', 'right'][arrow]} arrow: precision ${c.tp}/${c.tp + c.fp} = ${fmt(m.precision * 100, 0)}%, recall ${c.tp}/${c.tp + c.fn} = ${fmt(m.recall * 100, 0)}%.`;
  } else if (Math.abs(t) < 1e-9) {
    insight = 'Threshold 0 is the default for decision_function scores. Move it right to trade recall for precision, left for the reverse.';
  } else {
    insight = `${t > 0 ? 'Higher' : 'Lower'} than the default 0, so ${t > 0 ? 'fewer' : 'more'} instances are called positive: precision ${r3(m.precision)} (${r3(ref.precision)} at 0), recall ${r3(m.recall)} (${r3(ref.recall)} at 0).`;
  }
  return (
    <div class="stack">
      <div class="wg-row">
        <Seg
          label="Data"
          value={which}
          onChange={pick}
          options={[
            { value: 'd24', label: '24 scores' },
            { value: 'slide', label: 'Slide s17 (12 digits)' },
          ]}
        />
        {which === 'slide' &&
          SLIDE_ARROWS.map((v, i) => (
            <Btn key={v} size="sm" kind={t === v ? 'primary' : ''} onClick={() => setT(v)}>
              {['Left', 'Middle', 'Right'][i]} arrow
            </Btn>
          ))}
      </div>
      <div class="metrics-threshold-ctl">
        <Slider
          label="Threshold (predict positive if score > threshold)"
          value={t}
          min={ds.dom[0]}
          max={ds.dom[1]}
          step={ds.step}
          onInput={(v) => setT(+v.toFixed(2))}
          format={(v) => fmt(v, 1)}
        />
      </div>
      <ScoreLine ds={ds} t={t} setT={setT} />
      <div class="wg-legend">
        <span>● actual positive (a 5)</span>
        <span>■ actual negative</span>
        <span>filled = predicted positive (score &gt; threshold), hollow = predicted negative</span>
      </div>
      <Fb kind="info">{insight}</Fb>
      <div class="metrics-threshold-grid">
        <div class="stack-sm">
          <CM c={c} />
          <div class="readouts">
            <Readout label="Precision" value={r3(m.precision)} sub={`TP/(TP+FP) = ${c.tp}/${c.tp + c.fp}`} tone="blue" />
            <Readout label="Recall (TPR)" value={r3(m.recall)} sub={`TP/(TP+FN) = ${c.tp}/${c.tp + c.fn}`} tone="blue" />
            <Readout label="F1" value={r3(m.f1)} sub="2PR/(P+R)" />
            <Readout label="Accuracy" value={r3(m.accuracy)} sub={`(TP+TN)/${c.tp + c.tn + c.fp + c.fn}`} />
            <Readout label="FPR" value={r3(m.fpr)} sub={`FP/(FP+TN) = ${c.fp}/${c.fp + c.tn}`} />
          </div>
        </div>
        <Curve kind="pr" pts={pts.slice(1)} cur={[m.recall, m.precision]} />
        <Curve kind="roc" pts={pts} cur={[m.fpr, m.tpr]} aucV={aucV} />
      </div>
      <div class="wg-legend">
        <span>
          <span class="metrics-threshold-dot">●</span> on each curve = the current threshold; the curves themselves sweep every threshold
        </span>
      </div>
      {which === 'd24' && (
        <div class="wg-note">
          Recall can only fall as the threshold rises; precision usually rises but can dip (try 2.0 → 2.5: one more 5 drops below
          the line while the not-5 at 2.65 stays above).
        </div>
      )}
    </div>
  );
}

function CountsMode() {
  const [c, setC] = useState(PRESETS.q10.c);
  const m = metrics(c);
  const n = c.tn + c.fp + c.fn + c.tp;
  const isQ10 = Object.entries(PRESETS.q10.c).every(([k, v]) => c[k] === v);
  const f1Work =
    Number.isFinite(m.precision) && Number.isFinite(m.recall) && m.precision + m.recall > 0
      ? `2 × ${fmt(m.precision, 3)} × ${fmt(m.recall, 3)} / (${fmt(m.precision, 3)} + ${fmt(m.recall, 3)})`
      : '2TP/(2TP + FP + FN)';
  return (
    <div class="stack">
      <div class="wg-row">
        {Object.entries(PRESETS).map(([k, p]) => (
          <Btn key={k} size="sm" onClick={() => setC(p.c)}>
            {p.label}
          </Btn>
        ))}
      </div>
      <div class="wg-split">
        <div class="wg-controls">
          <CM c={c} edit={setC} />
          <div class="readouts">
            <Readout label="Precision" value={r3(m.precision)} tone="blue" />
            <Readout label="Recall" value={r3(m.recall)} tone="blue" />
            <Readout label="F1" value={r3(m.f1)} />
          </div>
        </div>
        <div class="wg-plot">
          <div class="calc-steps metrics-threshold-steps" aria-live="polite">
            <div>
              Precision = TP/(TP+FP) = {commas(c.tp)}/({commas(c.tp)} + {commas(c.fp)}) = <b>{r3(m.precision)}</b>
            </div>
            <div class="why">Of everything called positive, the share that really is positive.</div>
            <div>
              Recall = TP/(TP+FN) = {commas(c.tp)}/({commas(c.tp)} + {commas(c.fn)}) = <b>{r3(m.recall)}</b>
            </div>
            <div class="why">Of all real positives, the share we found (= TPR, sensitivity).</div>
            <div>
              F1 = 2PR/(P+R) = {f1Work} = <b>{r3(m.f1)}</b>
            </div>
            <div class="why">Harmonic mean: it stays low unless precision and recall are both high.</div>
            <div>
              Accuracy = (TP+TN)/total = {commas(c.tp + c.tn)}/{commas(n)} = <b>{r3(m.accuracy)}</b>
            </div>
            <div>
              FPR = FP/(FP+TN) = {commas(c.fp)}/({commas(c.fp)} + {commas(c.tn)}) = <b>{r3(m.fpr)}</b>
            </div>
          </div>
          {isQ10 && (
            <Fb kind="hint">
              2024 Q10 asks for the RECALL: 600 of the 800 positives were found, so recall = 600/800 = 0.75. That is not 0.1, 0.5 or
              0.05, so the answer is “all other answers are wrong”. 0.5 is the precision (600 of 1,200 flagged). The question gives
              no TN; 1,400 here is a filler, and precision, recall and F1 never use TN.
            </Fb>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MetricsThreshold({ mode: mode0 = 'threshold' }) {
  const [mode, setMode] = useState(mode0);
  return (
    <WidgetFrame
      title="Precision, recall and the threshold"
      lead="Drag the threshold along the scores: everything to its right is predicted positive. Or switch to Enter counts to check a test question."
      foot={
        <span>
          Raising the threshold predicts fewer positives: precision usually goes up and recall goes down; F1 = 2PR/(P+R) is their
          harmonic mean. The ROC curve plots TPR against FPR over all thresholds: AUC 0.5 = random guessing, 1 = perfect.
        </span>
      }
    >
      <style>{css}</style>
      <Seg
        label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'threshold', label: 'Move the threshold' },
          { value: 'counts', label: 'Enter counts' },
        ]}
      />
      {mode === 'threshold' ? <ThresholdMode /> : <CountsMode />}
    </WidgetFrame>
  );
}
