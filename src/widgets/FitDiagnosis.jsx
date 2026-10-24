// Diagnose under/overfitting with the W12a flowchart: training error, generalisation gap, train-val mismatch; plus the error-analysis ceiling (W12a s7-13).
import { useState } from 'preact/hooks';
import { WidgetFrame, Slider, Btn, Num, Fb, Chip } from '../ui.jsx';
import { fmt } from '../lib/svg.js';
import { diagnose, ceiling } from './fit-diagnosis-math.js';
import { Check } from './c-helpers.jsx';

const css = `
.fit-diagnosis-bar { position: relative; display: flex; height: 34px; border-radius: 6px; background: var(--paper-3); overflow: hidden; border: 1px solid var(--rule-2); }
.fit-diagnosis-bar > span { display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; min-width: 0; }
.fit-diagnosis-bar .fit-diagnosis-tr { background: var(--biro); color: var(--on-biro); }
.fit-diagnosis-bar .fit-diagnosis-gp { background: var(--hint-soft); color: var(--ink); background-image: repeating-linear-gradient(45deg, var(--hint) 0 1.5px, transparent 1.5px 7px); }
.fit-diagnosis-bar .fit-diagnosis-mm { background: var(--marker-soft); color: var(--ink); background-image: repeating-linear-gradient(-45deg, var(--marker) 0 1.5px, transparent 1.5px 5px); }
.fit-diagnosis-pill { font-style: normal; background: var(--paper); color: var(--ink); border-radius: 4px; padding: 1px 5px; }
.fit-diagnosis-target { position: absolute; top: -4px; bottom: -4px; width: 0; border-left: 2px dashed var(--ink); }
.fit-diagnosis-wrap { position: relative; padding-top: 18px; }
.fit-diagnosis-tl { position: absolute; top: 0; transform: translateX(-50%); font-size: 12px; font-weight: 700; color: var(--ink-2); white-space: nowrap; }
.fit-diagnosis-eq { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; overflow-wrap: anywhere; }
.fit-diagnosis-flow { display: grid; gap: 8px; }
.fit-diagnosis-step { border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 8px 10px; display: grid; gap: 4px; background: var(--paper); }
.fit-diagnosis-step.fit-diagnosis-on { border: 2px solid var(--marker); background: var(--marker-soft); }
.fit-diagnosis-step.fit-diagnosis-ok { border-color: var(--tick); }
.fit-diagnosis-step.fit-diagnosis-skip { opacity: 0.8; border-style: dashed; }
.fit-diagnosis-step.fit-diagnosis-done { border: 2px solid var(--tick); background: var(--tick-soft); }
.fit-diagnosis-q { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; justify-content: space-between; font-weight: 700; font-size: 14px; }
.fit-diagnosis-why { font-size: 13px; color: var(--ink-2); }
.fit-diagnosis-step ul { margin: 2px 0 0; padding-left: 20px; font-size: 13.5px; }
.fit-diagnosis-calc { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.fit-diagnosis-calc label { display: inline-flex; gap: 6px; align-items: center; font-size: 13.5px; color: var(--ink-2); }
.fit-diagnosis-sec { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--ink-2); }
.fit-diagnosis-hr { border: 0; border-top: 1px dashed var(--rule-2); margin: 2px 0; width: 100%; }
`;

const PRESETS = {
  under: { label: 'Underfit', train: 18, holdout: 19, tv: null, target: 5 },
  over: { label: 'Overfit', train: 2, holdout: 15, tv: null, target: 5 },
  mismatch: { label: 'Mismatch', train: 2, holdout: 14, tv: 3, target: 5 },
  fine: { label: 'Fine', train: 3, holdout: 4, tv: null, target: 5 },
};

const ACTIONS = {
  train: ['More flexible model', 'Less regularisation', 'Train longer (neural nets)', 'Add more features'],
  gap: ['Less flexible model', 'More regularisation', 'Early stopping', 'Bagging', 'Get more training data'],
  mismatch: [
    'Make the training data more like the data you care about',
    'Keep validation and test data from the target distribution only (extra, different data goes into training)',
  ],
};
const CAUSES = [
  { label: 'Dark pedestrians', n: 10 },
  { label: 'Tilted images', n: 30 },
  { label: 'Mislabelled', n: 15 },
];
const p = (v) => fmt(v, 1) + '%';

export default function FitDiagnosis() {
  const [train, setTrain] = useState(18);
  const [holdout, setHoldout] = useState(19);
  const [useTv, setUseTv] = useState(false);
  const [tv, setTv] = useState(3);
  const [target, setTarget] = useState(5);
  const [acc, setAcc] = useState(90);
  const [examined, setExamined] = useState(100);
  const [nCause, setNCause] = useState(10);

  const load = (k) => {
    const P = PRESETS[k];
    setTrain(P.train);
    setHoldout(P.holdout);
    setUseTv(P.tv != null);
    if (P.tv != null) setTv(P.tv);
    setTarget(P.target);
  };
  const d = diagnose({ train, holdout, trainVal: useTv ? tv : null, target });
  const gap = Math.max(0, d.gap);
  const mm = useTv ? Math.max(0, d.mismatch) : 0;
  const scaleMax = Math.max(30, holdout, train, useTv ? tv : 0, target);
  const W = (v) => (100 * v) / scaleMax + '%';
  const midE = useTv ? tv : holdout;
  const preset = Object.entries(PRESETS).find(([, P]) => P.train === train && P.holdout === holdout && P.target === target && (P.tv == null ? !useTv : useTv && P.tv === tv));

  const steps = [
    {
      key: 'train',
      q: 'High training error?',
      yes: train > target,
      why: `E_train ${p(train)} ${train > target ? '>' : '≤'} target ${p(target)}`,
    },
    {
      key: 'gap',
      q: 'High generalisation gap?',
      yes: midE > target,
      why: `gap ${p(gap)} takes ${useTv ? 'E_train-val' : 'E_hold-out'} to ${p(midE)} ${midE > target ? '>' : '≤'} target`,
    },
  ];
  if (useTv) steps.push({ key: 'mismatch', q: 'Train-val mismatch?', yes: holdout > target, why: `mismatch ${p(mm)} takes E_hold-out to ${p(holdout)} ${holdout > target ? '>' : '≤'} target` });
  const firstYes = steps.findIndex((s) => s.yes);

  const gain = ceiling(acc / 100, examined, Math.min(nCause, examined));

  return (
    <WidgetFrame
      title="Diagnose under- and overfitting"
      lead="Set the training and hold-out errors (or pick a preset) and follow the W12 flowchart: training error first, then the gap."
      actions={Object.entries(PRESETS).map(([k, v]) => (
        <Btn size="sm" key={k} kind={preset && preset[0] === k ? 'primary' : ''} onClick={() => load(k)}>
          {v.label}
        </Btn>
      ))}
      foot={
        <span>
          Fix the training error first (more flexible model, less regularisation, train longer, more features). Once it is low, shrink the
          generalisation gap (less flexible model, more regularisation, early stopping, bagging, more data). A train-val set tells a real gap
          apart from a train/validation mismatch.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="Training error E_train" value={train} min={0} max={30} step={0.5} onInput={setTrain} format={p} />
          <Check checked={useTv} onChange={setUseTv}>
            I also have a train-val set
          </Check>
          {useTv && (
            <Slider
              label="Train-val error E_train-val"
              value={tv}
              min={0}
              max={30}
              step={0.5}
              onInput={setTv}
              format={p}
              hint="held-out slice of the training distribution"
            />
          )}
          <Slider label="Hold-out (validation) error" value={holdout} min={0} max={30} step={0.5} onInput={setHoldout} format={p} />
          <Slider label="Target error" value={target} min={0} max={20} step={0.5} onInput={setTarget} format={p} hint="what you need, e.g. human-level error" />
        </div>
        <div class="stack">
          <div class="fit-diagnosis-wrap">
            <span class="fit-diagnosis-tl" style={{ left: W(target) }}>
              target {p(target)}
            </span>
            <div class="fit-diagnosis-bar" role="img" aria-label={`Training error ${p(train)}, gap ${p(gap)}${useTv ? `, mismatch ${p(mm)}` : ''}`}>
              <span class="fit-diagnosis-tr" style={{ width: W(train) }}>
                {train / scaleMax > 0.12 ? `train ${p(train)}` : ''}
              </span>
              <span class="fit-diagnosis-gp" style={{ width: W(gap) }}>
                {gap / scaleMax > 0.14 ? <em class="fit-diagnosis-pill">gap {p(gap)}</em> : ''}
              </span>
              {useTv && (
                <span class="fit-diagnosis-mm" style={{ width: W(mm) }}>
                  {mm / scaleMax > 0.22 ? <em class="fit-diagnosis-pill">mismatch {p(mm)}</em> : ''}
                </span>
              )}
              <span class="fit-diagnosis-target" style={{ left: W(target) }} />
            </div>
          </div>
          <div class="wg-legend">
            <span>
              <span class="sw" style={{ background: 'var(--biro)' }} />
              training error
            </span>
            <span>
              <span class="sw" style={{ background: 'var(--hint)' }} />
              generalisation gap (striped)
            </span>
            {useTv && (
              <span>
                <span class="sw" style={{ background: 'var(--marker)' }} />
                train-val mismatch (striped)
              </span>
            )}
          </div>
          <div class="fit-diagnosis-eq" aria-live="polite">
            {useTv
              ? `E_hold-out ${p(holdout)} = E_train ${p(train)} + gap ${p(d.gap)} + mismatch ${p(d.mismatch)}`
              : `E_hold-out ${p(holdout)} = E_train ${p(train)} + gap ${p(d.gap)}`}
          </div>
          {d.gap < 0 && <div class="faint small">Hold-out error below training error: that's luck/noise, treat the gap as 0.</div>}
          <div class="fit-diagnosis-flow">
            {steps.map((s, i) => {
              const state = firstYes === -1 ? 'ok' : i < firstYes ? 'ok' : i === firstYes ? 'on' : 'skip';
              return (
                <div key={s.key} class={`fit-diagnosis-step fit-diagnosis-${state}`}>
                  <div class="fit-diagnosis-q">
                    <span>
                      {i + 1}. {s.q}
                    </span>
                    {state === 'skip' ? <Chip>check after fixing step {firstYes + 1}</Chip> : <Chip kind={s.yes ? 'bad' : 'good'}>{s.yes ? 'Yes' : 'No'}</Chip>}
                  </div>
                  <div class="fit-diagnosis-why">{s.why}</div>
                  {state === 'on' && (
                    <ul>
                      {ACTIONS[s.key].map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {firstYes === -1 && (
              <div class="fit-diagnosis-step fit-diagnosis-done">
                <div class="fit-diagnosis-q">
                  <span>Done</span>
                  <Chip kind="good">all below target</Chip>
                </div>
                <div class="fit-diagnosis-why">Training and hold-out errors are both at or below the target: evaluate once on the test set.</div>
              </div>
            )}
          </div>
          {firstYes >= 0 && (
            <Fb kind="hint">
              {steps[firstYes].key === 'train' && 'Underfitting: the model cannot even fit the training data. Reduce the training error first.'}
              {steps[firstYes].key === 'gap' && 'Overfitting: training error is fine but the model does not generalise. Reduce the gap.'}
              {steps[firstYes].key === 'mismatch' &&
                'Train/validation mismatch: the model generalises within the training distribution (small gap) but the validation data looks different.'}
            </Fb>
          )}
        </div>
      </div>

      <hr class="fit-diagnosis-hr" />
      <div class="fit-diagnosis-sec">Error analysis: the most a fix can gain (W12a s11)</div>
      <div class="fit-diagnosis-calc">
        <label>
          accuracy %
          <Num value={acc} min={0} max={100} step={1} width={64} label="validation accuracy in percent" onChange={(v) => setAcc(Math.max(0, Math.min(100, v)))} />
        </label>
        <label>
          errors examined
          <Num value={examined} min={1} step={10} width={70} label="number of misclassified examples examined" onChange={(v) => setExamined(Math.max(1, Math.round(v)))} />
        </label>
        <label>
          with this cause
          <Num value={nCause} min={0} step={1} width={64} label="examined errors with this cause" onChange={(v) => setNCause(Math.max(0, Math.round(v)))} />
        </label>
      </div>
      <div class="wg-row">
        {CAUSES.map((c) => (
          <Btn size="sm" key={c.label} kind={nCause === c.n && examined === 100 && acc === 90 ? 'primary' : ''} onClick={() => { setAcc(90); setExamined(100); setNCause(c.n); }}>
            {c.label} ({c.n})
          </Btn>
        ))}
      </div>
      <div class="calc-steps">
        <div>
          gain ≤ {Math.min(nCause, examined)}/{examined} × (1 − {fmt(acc / 100, 3)}) = {fmt((Math.min(nCause, examined) / examined) * 100, 1)}% × {fmt(100 - acc, 1)}% ={' '}
          <b>
            {fmt(gain * 100, 2)} percentage point{Math.abs(gain * 100 - 1) < 1e-9 ? '' : 's'}
          </b>
        </div>
        <div class="why">
          Even fixing every one of these errors moves accuracy from {fmt(acc, 1)}% to at most {fmt(acc + gain * 100, 2)}%. Spend effort on the
          biggest cause.
        </div>
      </div>
    </WidgetFrame>
  );
}
