// AdaBoost reweighting, round by round: the lecture's 10-instance example (W7 s26-32, adapted from sefiks.com).
import { Fragment } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Seg, Slider, Btn, Fb, Readout, Plot, Bar } from '../ui.jsx';
import { fmt, fix, linePath, clamp } from '../lib/svg.js';
import { ACTUAL, LECTURE_PREDS, runAdaBoost, alphaOf, weightedVote } from './adaboost-steps-math.js';
import { useBoxWidth } from './w7-shared.js';

const NR = LECTURE_PREDS.length;
const SUB = ['₁', '₂', '₃'];
// what the slides print (s30-32), computed there from rounded intermediate values
const SLIDE = [
  'Slide s30: r₁ = 0.3, α₁ = 0.847, normalised 0.07147 / 0.16654.',
  'Slide s31: r₂ = 0.476, α₂ = 0.0958, normalised 0.075 / 0.159 / 0.068 / 0.175.',
  'Slide s32: r₃ = 0.204, α₃ = 1.3575, updated 0.2651, normalised 0.0472 / 0.0999 / 0.1667 / 0.1100 / 0.0429.',
];
const CURVE = Array.from({ length: 197 }, (_, i) => 0.01 + i * 0.005);
const w4 = (v) => (Number.isFinite(v) ? fmt(v, 4) : fmt(v));
const a4 = (v) => (Number.isFinite(v) ? fix(v, 4) : fmt(v));
const same = (a, b) => a.every((row, j) => row.every((v, i) => v === b[j][i]));

const css = `
.adaboost-steps-ctl { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
.adaboost-steps-ctl .ctl { width: min(100%, 250px); }
.adaboost-steps-nav { display: flex; align-items: center; gap: 6px; }
.adaboost-steps-roundlabel { font-family: var(--font-display); font-weight: 700; font-size: 14px; min-width: 104px; text-align: center; }
.adaboost-steps-main { display: grid; gap: 16px; align-items: start; }
@media (min-width: 760px) { .adaboost-steps-main { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
table.mini.adaboost-steps-table { width: 100%; }
table.mini.adaboost-steps-table th, table.mini.adaboost-steps-table td { padding: 3px 5px; font-size: 13px; }
table.mini.adaboost-steps-table th { line-height: 1.25; }
table.mini.adaboost-steps-table td.num { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; text-align: right; }
@media (max-width: 520px) {
  table.mini.adaboost-steps-table th, table.mini.adaboost-steps-table td { padding: 2px 3px; font-size: 12.5px; }
  table.mini.adaboost-steps-table td.num { font-size: 12px; }
}
.adaboost-steps-table td.up { font-weight: 700; }
.adaboost-steps-table .x { color: var(--marker); font-weight: 700; margin-left: 3px; }
.adaboost-steps-table .ok { color: var(--ink-3); margin-left: 3px; }
.adaboost-steps-table tfoot td { border-top: 2px solid var(--rule-2); background: var(--paper-2); }
tr.adaboost-steps-click { cursor: pointer; }
tr.adaboost-steps-click:hover td { background: var(--paper-2); }
tr.adaboost-steps-click.hl:hover td { background: var(--hl); }
.adaboost-steps-toggle { all: unset; box-sizing: border-box; cursor: pointer; padding: 1px 6px; border-radius: 5px; border: 1px dashed var(--ink-3); white-space: nowrap; }
.adaboost-steps-toggle:hover { border-style: solid; }
.adaboost-steps-toggle:focus-visible { outline: 2px solid var(--biro); outline-offset: 1px; }
.adaboost-steps-cap { font-size: 13px; font-weight: 700; color: var(--ink-2); }
.adaboost-steps-nt { text-transform: none; }
.adaboost-steps-side { display: grid; gap: 12px; min-width: 0; align-content: start; }
svg.plot.adaboost-steps-plot { touch-action: auto; }
.adaboost-steps-curve { fill: none; stroke: var(--biro); stroke-width: 2.5; }
.adaboost-steps-curve1 { fill: none; stroke: var(--ink-3); stroke-width: 1.2; stroke-dasharray: 4 4; }
.adaboost-steps-pt { fill: var(--paper); stroke: var(--ink-2); stroke-width: 2; }
.adaboost-steps-pt.on { fill: var(--marker); stroke: var(--marker); }
.adaboost-steps-zero { stroke: var(--axis); stroke-width: 1; stroke-dasharray: 3 3; }
.adaboost-steps-panel { border: 1px solid var(--rule); border-radius: var(--r-sm); background: var(--paper-2); padding: 10px 12px; display: grid; gap: 10px; min-width: 0; }
.adaboost-steps-strip { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; max-width: 460px; }
.adaboost-steps-chip { all: unset; box-sizing: border-box; display: grid; justify-items: center; padding: 3px 0; border-radius: 5px; border: 1px solid var(--rule-2); background: var(--paper); font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; cursor: pointer; line-height: 1.3; min-width: 0; }
.adaboost-steps-chip.on { border-color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
.adaboost-steps-chip:focus-visible { outline: 2px solid var(--biro); outline-offset: 1px; }
.adaboost-steps-chip .n { color: var(--ink-3); font-size: 11px; }
.adaboost-steps-chip .ok { color: var(--tick); font-weight: 700; }
.adaboost-steps-chip .no { color: var(--marker); font-weight: 700; }
.adaboost-steps-vote { display: grid; grid-template-columns: auto minmax(60px, 1fr) auto; gap: 6px 10px; align-items: center; font-size: 13.5px; max-width: 560px; }
.adaboost-steps-vote .num { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; text-align: right; }
.adaboost-steps-vote .terms { grid-column: 1 / -1; font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; color: var(--ink-2); margin-top: -4px; overflow-wrap: anywhere; }
`;

export default function AdaboostSteps() {
  const [j, setJ] = useState(0);
  const [eta, setEta] = useState(1);
  const [free, setFree] = useState(false);
  const [preds, setPreds] = useState(() => LECTURE_PREDS.map((r) => r.slice()));
  const [inst, setInst] = useState(2);
  const rounds = useMemo(() => runAdaBoost(ACTUAL, preds, eta), [preds, eta]);
  const rd = rounds[j];
  const lecture = same(preds, LECTURE_PREDS);
  const [ref, w] = useBoxWidth(400);
  const h = Math.round(clamp(w * 0.5, 190, 250));

  const toggle = (i) => setPreds(preds.map((row, a) => (a === j ? row.map((v, b) => (b === i ? 1 - v : v)) : row)));
  const nWrong = rd.wrong.filter(Boolean).length;
  const wrongW = rd.before.filter((_, i) => rd.wrong[i]);
  const distinct = (pairs) => {
    const seen = new Map();
    pairs.forEach(([a, b]) => seen.set(a.toFixed(6), [a, b]));
    return [...seen.values()];
  };
  const upPairs = distinct(rd.before.map((v, i) => [v, rd.updated[i]]).filter((_, i) => rd.wrong[i]));
  const normPairs = distinct(rd.updated.map((v, i) => [v, rd.normalised[i]]));
  const sofar = rounds.slice(0, j + 1);
  const votes = ACTUAL.map((_, i) => weightedVote(sofar, i));
  const nRight = votes.filter((v, i) => v.pred === ACTUAL[i]).length;
  const vi = votes[inst];
  const totalAbs = sofar.reduce((s, r) => s + Math.abs(Number.isFinite(r.alpha) ? r.alpha : 0), 0) || 1;
  const sub = SUB[j];

  let fb;
  if (rd.r <= 0)
    fb = (
      <Fb kind="bad">
        r{sub} = 0: a perfect learner gets α = ln(1/0) = ∞, outvotes everything after it, and leaves no mistakes to reweight. That is why
        every base learner should be non-perfect (sklearn stops boosting here). Weights are carried over unchanged.
      </Fb>
    );
  else if (rd.r >= 1) fb = <Fb kind="bad">r{sub} = 1: every instance is wrong, so α = −∞. The weights are carried over unchanged.</Fb>;
  else if (Math.abs(rd.r - 0.5) < 1e-9) fb = <Fb kind="info">r{sub} = 0.5: a coin-flip learner gets α = 0, no say in the vote, and the weights don't change.</Fb>;
  else if (rd.r > 0.5)
    fb = (
      <Fb kind="hint">
        r{sub} &gt; 0.5: worse than chance, so α{sub} &lt; 0. Its vote counts against the class it predicts, and its mistakes lose weight
        (e^α &lt; 1).
      </Fb>
    );
  else
    fb = (
      <Fb kind="info">
        The {nWrong} misclassified row{nWrong === 1 ? '' : 's'} (✗) {nWrong === 1 ? 'is' : 'are'} multiplied by e^α{sub} = {fix(rd.factor, 3)}, then every
        weight is divided by the new sum, so they now carry {fix(rd.normalised.reduce((s, v, i) => s + (rd.wrong[i] ? v : 0), 0), 3)} of the
        total weight instead of {fix(rd.r, 3)}{eta === 1 ? ' (with η = 1 always exactly half)' : ''}. The next learner trains on these weights.
      </Fb>
    );

  return (
    <WidgetFrame
      title="AdaBoost reweighting, round by round"
      lead="Step through the lecture's three rounds; switch on free play and click rows to change which ones a round gets wrong."
      foot={
        <span>
          Misclassified instances are multiplied by e^α and all weights renormalised, so the next learner focuses on them. A better learner
          (smaller weighted error r) gets a bigger say, α = η ln((1 − r)/r): α = 0 at r = 0.5 and α → ∞ as r → 0, so every base learner
          must be non-perfect. Each round needs the previous round's weights: training is inherently sequential.
        </span>
      }
    >
      <style>{css}</style>
      <div class="adaboost-steps-ctl">
        <div class="adaboost-steps-nav">
          <Btn size="sm" onClick={() => setJ(j - 1)} disabled={j === 0} aria-label="Previous round">
            ◀ Prev
          </Btn>
          <span class="adaboost-steps-roundlabel" aria-live="polite">
            Round {j + 1} of {NR}
          </span>
          <Btn size="sm" kind="primary" onClick={() => setJ(j + 1)} disabled={j === NR - 1} aria-label="Next round">
            Next ▶
          </Btn>
        </div>
        <Seg
          label="Mode"
          value={free}
          onChange={setFree}
          options={[
            { value: false, label: 'Lecture rounds' },
            { value: true, label: 'Free play' },
          ]}
        />
        {!lecture && (
          <Btn size="sm" kind="ghost" onClick={() => setPreds(LECTURE_PREDS.map((r) => r.slice()))}>
            Reset predictions
          </Btn>
        )}
        <Slider label="Learning rate η" value={eta} min={0.1} max={1} step={0.05} onInput={setEta} format={(v) => fmt(v, 2)} />
      </div>
      <div class="adaboost-steps-main">
        <div class="stack-sm">
          <div class="adaboost-steps-cap">
            Round {j + 1}: weights before and after{free ? ' (click a row to flip its prediction)' : ''}
          </div>
          <div class="mini-wrap">
            <table class="mini adaboost-steps-table" aria-label={`Round ${j + 1} weights`}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Actual</th>
                  <th>
                    Pred.
                    <br />ŷ{sub}
                  </th>
                  <th>
                    Weight
                    <br />w
                  </th>
                  <th>
                    Updated
                    <br />
                    <span class="faint">{rd.degenerate ? '(same)' : `(wrong ×${fmt(rd.factor, 3)})`}</span>
                  </th>
                  <th>
                    Normal-
                    <br />
                    ised
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACTUAL.map((y, i) => {
                  const wrong = rd.wrong[i];
                  const mark = wrong ? <span class="x">✗</span> : <span class="ok">✓</span>;
                  return (
                    <tr key={i} class={`${wrong ? 'hl' : ''} ${free ? 'adaboost-steps-click' : ''}`} onClick={free ? () => toggle(i) : undefined}>
                      <td>{i + 1}</td>
                      <td>{y}</td>
                      <td>
                        {free ? (
                          <button
                            type="button"
                            class="adaboost-steps-toggle"
                            aria-label={`Instance ${i + 1}: round ${j + 1} predicts ${rd.pred[i]}, ${wrong ? 'wrong' : 'right'}. Click to flip.`}
                          >
                            {rd.pred[i]}
                            {mark}
                          </button>
                        ) : (
                          <span>
                            {rd.pred[i]}
                            {mark}
                          </span>
                        )}
                      </td>
                      <td class="num">{w4(rd.before[i])}</td>
                      <td class={`num ${wrong ? 'up' : ''}`}>{w4(rd.updated[i])}</td>
                      <td class="num">{w4(rd.normalised[i])}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} class="l">
                    Sum
                  </td>
                  <td class="num">{w4(rd.total)}</td>
                  <td class="num">{w4(rd.sumUpdated)}</td>
                  <td class="num">1</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {lecture && eta === 1 && <div class="faint small">{SLIDE[j]} Tiny differences come from the slides rounding before the next step.</div>}
        </div>
        <div class="adaboost-steps-side">
          <div class="readouts">
            <Readout
              label={
                <span>
                  Error <span class="adaboost-steps-nt">r{sub}</span>
                </span>
              }
              value={fmt(rd.r, 4)}
              sub={`${nWrong} of 10 rows wrong`}
            />
            <Readout
              label={
                <span>
                  Say <span class="adaboost-steps-nt">α{sub}</span>
                </span>
              }
              value={a4(rd.alpha)}
              sub={`η = ${fmt(eta, 2)}`}
              tone="blue"
            />
          </div>
          <div class="calc-steps" aria-live="polite">
            <div>
              r{sub} = Σw(wrong) / Σw = {nWrong ? (nWrong <= 4 ? '(' + wrongW.map((v) => fmt(v, 4)).join(' + ') + ')' : fmt(rd.wrongSum, 4)) : '0'} /{' '}
              {fmt(rd.total, 4)} = {fix(rd.r, 4)}
            </div>
            <div>
              α{sub} = η·ln((1 − r)/r) = {fmt(eta, 2)}·ln({fix(1 - rd.r, 3)}/{fix(rd.r, 3)}) = {a4(rd.alpha)}
            </div>
            {!rd.degenerate && upPairs.length > 0 && (
              <div>
                wrong rows: {upPairs.map(([a, b]) => `${fmt(a, 4)} × ${fix(rd.factor, 3)} = ${fmt(b, 4)}`).join('; ')}
              </div>
            )}
            {!rd.degenerate && (
              <div>
                ÷ {fmt(rd.sumUpdated, 4)}: {normPairs.slice(0, 5).map(([a, b]) => `${fmt(a, 4)} → ${fmt(b, 4)}`).join(', ')}
              </div>
            )}
          </div>
          <div class="wg-plot">
            <div class="adaboost-steps-cap">The learner's say α against its weighted error r</div>
            <div ref={ref}>
              <Plot
                w={w}
                h={h}
                x={[0, 1]}
                y={[-5, 5]}
                pad={{ l: 34, r: 12, t: 12, b: 34 }}
                xTicks={[0, 0.25, 0.5, 0.75, 1]}
                yTicks={[-4, -2, 0, 2, 4]}
                xLabel="weighted error r"
                class="adaboost-steps-plot"
                label={`Alpha against error r for learning rate ${fmt(eta, 2)}; round ${j + 1} at r = ${fix(rd.r, 3)}`}
              >
                {({ X, Y, w: W, h: H, pad }) => (
                  <g>
                    <line class="adaboost-steps-zero" x1={X(0.5)} x2={X(0.5)} y1={pad.t} y2={H - pad.b} />
                    {eta < 1 && <path class="adaboost-steps-curve1" d={linePath(CURVE.map((r) => [r, alphaOf(r, 1)]), X, Y)} />}
                    <path class="adaboost-steps-curve" d={linePath(CURVE.map((r) => [r, alphaOf(r, eta)]), X, Y)} />
                    <text class="lbl" x={X(0.035)} y={pad.t + 12}>
                      α → ∞ as r → 0
                    </text>
                    <text class="lbl" x={X(0.5) + 6} y={Y(0) - 7}>
                      r = 0.5: α = 0
                    </text>
                    <text class="lbl" x={X(0.53)} y={H - pad.b - 8}>
                      α &lt; 0: worse than chance
                    </text>
                    {rounds.map((r, k) =>
                      Number.isFinite(r.alpha) ? (
                        <g key={k}>
                          <circle class={`adaboost-steps-pt ${k === j ? 'on' : ''}`} cx={X(r.r)} cy={Y(clamp(r.alpha, -5, 5))} r={k === j ? 6 : 4.5} />
                          <text class="lbl-strong" x={X(r.r) + 9} y={Y(clamp(r.alpha, -5, 5)) + (k === 1 ? 16 : -6)}>
                            {k + 1}
                          </text>
                        </g>
                      ) : null
                    )}
                  </g>
                )}
              </Plot>
            </div>
            <div class="wg-legend">
              <span>
                <span class="sw" style={{ background: 'var(--biro)' }} />
                α = {fmt(eta, 2)}·ln((1 − r)/r)
              </span>
              {eta < 1 && (
                <span>
                  <span class="sw" style={{ background: 'var(--ink-3)' }} />
                  dashed: η = 1
                </span>
              )}
              <span>
                <span class="sw" style={{ background: 'var(--marker)', borderRadius: '50%' }} />
                round {j + 1} (numbers: rounds)
              </span>
            </div>
          </div>
        </div>
      </div>
      {fb}
      <div class="adaboost-steps-panel">
        <div class="adaboost-steps-cap">
          Ensemble after round {j + 1}: ŷ = the class with the largest Σα of the learners voting for it ({nRight} of 10 right). Pick an
          instance:
        </div>
        <div class="adaboost-steps-strip" role="group" aria-label="Pick an instance">
          {votes.map((v, i) => {
            const ok = v.pred === ACTUAL[i];
            return (
              <button
                key={i}
                type="button"
                class={`adaboost-steps-chip ${i === inst ? 'on' : ''}`}
                aria-pressed={i === inst}
                aria-label={`Instance ${i + 1}: ensemble predicts ${v.pred}, actual ${ACTUAL[i]}`}
                onClick={() => setInst(i)}
              >
                <span class="n">#{i + 1}</span>
                <span>{v.pred}</span>
                <span class={ok ? 'ok' : 'no'}>{ok ? '✓' : '✗'}</span>
              </button>
            );
          })}
        </div>
        <div class="adaboost-steps-vote" aria-live="polite">
          {[1, 0].map((k) => (
            <Fragment key={k}>
              <span>Class {k}</span>
              <Bar
                value={Number.isFinite(vi.score[k]) ? Math.max(0, vi.score[k]) / totalAbs : vi.score[k] > 0 ? 1 : 0}
                tone={k === vi.pred ? 'tick' : 'ink'}
                label={`Class ${k}: total say ${a4(vi.score[k])}`}
              />
              <span class="num">{a4(vi.score[k])}</span>
              <span class="terms">
                {vi.parts[k].length ? vi.parts[k].map((r) => `α${SUB[r]} ${a4(rounds[r].alpha)}`).join(' + ') : 'no learner votes ' + k}
              </span>
            </Fragment>
          ))}
        </div>
        <div class="small">
          Instance #{inst + 1} (actual class {ACTUAL[inst]}): the ensemble predicts <b>{vi.pred}</b>{' '}
          {vi.pred === ACTUAL[inst] ? <span style={{ color: 'var(--tick)', fontWeight: 700 }}>✓ right</span> : <span style={{ color: 'var(--marker)', fontWeight: 700 }}>✗ wrong</span>}
          {vi.tie ? ' (a tie: argmax takes the first class)' : ''}.
        </div>
      </div>
    </WidgetFrame>
  );
}
