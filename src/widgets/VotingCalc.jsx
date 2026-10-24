// Hard vs soft voting on editable class probabilities (W7 s6-8, FAQ3; 2024 Test 1 Q7).
import { useState } from 'preact/hooks';
import { WidgetFrame, Seg, Btn, Fb, Num, Bar } from '../ui.jsx';
import { fix, fmt, clamp } from '../lib/svg.js';
import { hardVote, softVote, rowSum, normRow, countLabels } from './voting-calc-math.js';

const CLASSES = ['Class 1', 'Class 2', 'Class 3'];
const ANIMALS = ['Dog', 'Cat', 'Iguana', 'Penguin'];
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const p2 = (v) => fix(v, 2);

const PRESETS = {
  faq3: { label: 'Slide FAQ3', mode: 'probs', probs: [[0.95, 0.05], [0.45, 0.55], [0.4, 0.6]] },
  minority: {
    label: 'Confident minority',
    mode: 'probs',
    probs: [[0.9, 0.05, 0.05], [0.85, 0.1, 0.05], [0.35, 0.45, 0.2], [0.3, 0.4, 0.3], [0.25, 0.45, 0.3]],
  },
  labels: { label: 'Labels only (2024 test)', mode: 'labels', labels: ['Dog', 'Cat', 'Cat', 'Iguana', 'Penguin'], conf: [0.9, 0.45, 0.35, 0.6, 0.4] },
};

// rows added with "+ Model": each leans to a different class, so the new vote is never a tie
const NEW_ROW = {
  2: [[0.7, 0.3], [0.35, 0.65], [0.6, 0.4]],
  3: [[0.6, 0.3, 0.1], [0.2, 0.5, 0.3], [0.25, 0.25, 0.5]],
};

const listNames = (ids) => (ids.length <= 1 ? ids.join('') : ids.slice(0, -1).join(', ') + ' and ' + ids[ids.length - 1]);

const css = `
.voting-calc-grid { display: grid; gap: 16px; align-items: start; }
@media (min-width: 760px) { .voting-calc-grid { grid-template-columns: minmax(0, 330px) minmax(0, 1fr); } }
.voting-calc-left { display: grid; gap: 10px; min-width: 0; }
table.mini.voting-calc-table th, table.mini.voting-calc-table td { padding: 3px 5px; }
@media (max-width: 420px) { table.mini.voting-calc-table th, table.mini.voting-calc-table td { padding: 2px 3px; } }
.voting-calc-table th[scope="row"] { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; }
.voting-calc-table td.voting-calc-top { background: var(--hl); }
.voting-calc-table td.voting-calc-top .input { font-weight: 700; border-color: var(--hint); }
.voting-calc-table .input.num { min-height: 32px; padding: 3px 4px; }
.voting-calc-table tfoot th, .voting-calc-table tfoot td { border-top: 2px solid var(--rule-2); background: var(--paper-2); font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; }
.voting-calc-table tfoot td.voting-calc-top { background: var(--hl); font-weight: 700; }
.voting-calc-vote { font-weight: 700; white-space: nowrap; font-size: 13px; }
.voting-calc-sel { min-height: 32px; padding: 3px 6px; width: 104px; }
.voting-calc-panels { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.voting-calc-panel { border: 1px solid var(--rule); border-radius: var(--r-sm); background: var(--paper-2); padding: 10px 12px; display: grid; gap: 8px; align-content: start; min-width: 0; }
.voting-calc-ph { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); }
.voting-calc-sub { font-size: 12.5px; color: var(--ink-3); }
.voting-calc-res { font-family: var(--font-display); font-weight: 700; font-size: 19px; letter-spacing: -0.02em; }
.voting-calc-res small { font-family: var(--font-ui); font-size: 13px; font-weight: 600; color: var(--ink-2); letter-spacing: 0; margin-left: 6px; }
.voting-calc-trow { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; gap: 8px; align-items: center; font-size: 13.5px; min-height: 24px; }
.voting-calc-trow.win { font-weight: 700; }
.voting-calc-trow .num { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; text-align: right; }
.voting-calc-chips { display: flex; flex-wrap: wrap; gap: 3px; min-width: 0; }
.voting-calc-m { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 11.5px; font-weight: 600; padding: 1px 5px; border-radius: 5px; background: var(--paper); border: 1px solid var(--rule-2); }
.voting-calc-win { font-size: 11px; font-weight: 700; color: var(--tick); text-transform: uppercase; letter-spacing: 0.04em; margin-left: 4px; }
.voting-calc-calc { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; color: var(--ink-2); line-height: 1.5; overflow-wrap: anywhere; }
`;

export default function VotingCalc({ preset = 'faq3' }) {
  const p0 = PRESETS[preset] || PRESETS.faq3;
  const [mode, setMode] = useState(p0.mode);
  const [probs, setProbs] = useState(p0.mode === 'probs' ? p0.probs : PRESETS.faq3.probs);
  const [labels, setLabels] = useState(PRESETS.labels.labels);
  const [conf, setConf] = useState(PRESETS.labels.conf);

  const load = (k) => {
    const p = PRESETS[k];
    setMode(p.mode);
    if (p.mode === 'probs') setProbs(p.probs.map((r) => r.slice()));
    else {
      setLabels(p.labels.slice());
      setConf(p.conf.slice());
    }
  };

  const K = probs[0].length;
  const nModels = mode === 'probs' ? probs.length : labels.length;

  const setCell = (i, j, v) => {
    const val = r4(clamp(v, 0, 1));
    setProbs(
      probs.map((row, a) => {
        if (a !== i) return row;
        const next = row.slice();
        next[j] = val;
        if (row.length === 2) next[1 - j] = r4(1 - val); // two classes: keep the row summing to 1
        return next;
      })
    );
  };
  const setK = (k) => {
    if (k === K) return;
    if (k === 3) setProbs(probs.map((r) => [...r, 0]));
    else setProbs(probs.map((r) => normRow(r.slice(0, 2)).map(r4)));
  };
  const addModel = () => {
    if (nModels >= 5) return;
    if (mode === 'probs') setProbs([...probs, NEW_ROW[K][probs.length % 3].slice()]);
    else {
      setLabels([...labels, ANIMALS[labels.length % 4]]);
      setConf([...conf, 0.5]);
    }
  };
  const removeModel = () => {
    if (nModels <= 3) return;
    if (mode === 'probs') setProbs(probs.slice(0, -1));
    else {
      setLabels(labels.slice(0, -1));
      setConf(conf.slice(0, -1));
    }
  };

  return (
    <WidgetFrame
      title="Hard vs soft voting"
      lead="Edit the models' predicted probabilities and watch the two voting rules: count the votes, or average the probabilities."
      actions={Object.entries(PRESETS).map(([k, v]) => (
        <Btn size="sm" key={k} onClick={() => load(k)}>
          {v.label}
        </Btn>
      ))}
      foot={
        <span>
          Hard voting counts each model's top class (its argmax) and the most votes wins; soft voting averages the predicted
          probabilities, then takes the argmax, so a confident model carries more weight and the two rules can disagree
          (FAQ3: hard → Class 2, soft → Class 1). In sklearn: <code>VotingClassifier(voting='hard')</code> or{' '}
          <code>voting='soft'</code>; soft needs <code>predict_proba</code> from every model (e.g. <code>SVC(probability=True)</code>).
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-row">
        <Seg
          label="What each model reports"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'probs', label: 'Probabilities' },
            { value: 'labels', label: 'Label + confidence' },
          ]}
        />
        {mode === 'probs' && (
          <Seg
            label="Number of classes"
            value={K}
            onChange={setK}
            options={[
              { value: 2, label: '2 classes' },
              { value: 3, label: '3 classes' },
            ]}
          />
        )}
        <div class="row" style={{ gap: '6px' }}>
          <Btn size="sm" onClick={addModel} disabled={nModels >= 5} aria-label="Add a model">
            + Model
          </Btn>
          <Btn size="sm" onClick={removeModel} disabled={nModels <= 3} aria-label="Remove the last model">
            − Model
          </Btn>
        </div>
      </div>
      {mode === 'probs' ? (
        <ProbMode probs={probs} setCell={setCell} setProbs={setProbs} />
      ) : (
        <LabelMode labels={labels} conf={conf} setLabels={setLabels} setConf={setConf} />
      )}
    </WidgetFrame>
  );
}

function ProbMode({ probs, setCell, setProbs }) {
  const K = probs[0].length;
  const n = probs.length;
  const names = CLASSES.slice(0, K);
  const hard = hardVote(probs);
  const soft = softVote(probs);
  const bad = probs.map((r, i) => [i, rowSum(r)]).filter(([, s]) => Math.abs(s - 1) > 0.005);
  const agree = hard.winner === soft.winner && !hard.tie && !soft.tie;

  // explain a disagreement in the models' own numbers
  let why = null;
  if (!agree && !hard.tie && !soft.tie) {
    const hv = probs.map((r, i) => i).filter((i) => hard.votes[i] === hard.winner);
    const sv = probs.map((r, i) => i).filter((i) => hard.votes[i] === soft.winner);
    const hn = names[hard.winner];
    const sn = names[soft.winner];
    const vals = (ids, k) => ids.map((i) => p2(soft.rows[i][k])).join(', ');
    why = sv.length ? (
      <span>
        {hn} wins the count ({hard.counts[hard.winner]} of {n} votes), but {listNames(sv.map((i) => 'M' + (i + 1)))}{' '}
        {sv.length === 1 ? 'is' : 'are'} very sure of {sn} ({vals(sv, soft.winner)}) while {listNames(hv.map((i) => 'M' + (i + 1)))} only
        lean{hv.length === 1 ? 's' : ''} to {hn} ({vals(hv, hard.winner)}). Averaging gives {sn} {p2(soft.avg[soft.winner])} vs {hn}{' '}
        {p2(soft.avg[hard.winner])}.
      </span>
    ) : (
      <span>
        No model has {sn} as its top class, but every model gives it a fair share, so its average ({p2(soft.avg[soft.winner])}) is the
        highest. Soft voting can pick a class that gets zero hard votes.
      </span>
    );
  }

  return (
    <div class="voting-calc-grid">
      <div class="voting-calc-left">
        <div class="mx-cap">Predicted probabilities</div>
        <div class="mini-wrap">
          <table class="mini voting-calc-table" aria-label="Predicted class probabilities per model">
            <thead>
              <tr>
                <th class="l">Model</th>
                {names.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {probs.map((row, i) => (
                <tr key={i}>
                  <th class="l" scope="row">
                    M{i + 1}
                  </th>
                  {row.map((v, j) => (
                    <td key={j} class={j === hard.votes[i] ? 'voting-calc-top' : ''}>
                      <Num value={v} step={0.05} min={0} max={1} width={K === 3 ? 52 : 58} label={`M${i + 1} probability of ${names[j]}`} onChange={(x) => setCell(i, j, x)} />
                    </td>
                  ))}
                  <td class="voting-calc-vote">{names[hard.votes[i]].replace('Class ', 'C')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th class="l" scope="row">
                  Avg
                </th>
                {soft.avg.map((v, j) => (
                  <td key={j} class={j === soft.winner ? 'voting-calc-top' : ''}>
                    {p2(v)}
                  </td>
                ))}
                <td class="voting-calc-vote">→ {names[soft.winner].replace('Class ', 'C')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="faint small">Highlighted: each model's top class (its hard vote) and the highest average (the soft vote).</div>
        {bad.length > 0 && (
          <Fb kind="hint">
            {bad.map(([i, s]) => `M${i + 1} adds up to ${fmt(s, 3)}`).join('; ')}, not 1. Soft voting uses each row rescaled to sum to 1.{' '}
            <Btn size="sm" onClick={() => setProbs(probs.map((r) => normRow(r).map(r4)))}>
              Normalise rows
            </Btn>
          </Fb>
        )}
      </div>
      <div class="stack">
        <div class="voting-calc-panels">
          <div class="voting-calc-panel" aria-live="polite">
            <div>
              <div class="voting-calc-ph">Hard voting</div>
              <div class="voting-calc-sub">count each model's top class</div>
            </div>
            {names.map((c, k) => (
              <div key={c} class={`voting-calc-trow ${k === hard.winner && !hard.tie ? 'win' : ''}`}>
                <span>{c}</span>
                <span class="voting-calc-chips">
                  {hard.votes.map((v, i) =>
                    v === k ? (
                      <span key={i} class="voting-calc-m">
                        M{i + 1}
                      </span>
                    ) : null
                  )}
                </span>
                <span class="num">
                  {hard.counts[k]}
                  {k === hard.winner && !hard.tie && <span class="voting-calc-win">wins</span>}
                </span>
              </div>
            ))}
            <div class="voting-calc-res">
              {hard.tie ? 'Tie' : names[hard.winner]}
              <small>
                {hard.tie
                  ? `${hard.tied.map((k) => names[k]).join(' = ')} (${hard.counts[hard.winner]} each); np.argmax would take ${names[hard.tied[0]]}`
                  : `${hard.counts[hard.winner]} of ${n} votes`}
              </small>
            </div>
          </div>
          <div class="voting-calc-panel" aria-live="polite">
            <div>
              <div class="voting-calc-ph">Soft voting</div>
              <div class="voting-calc-sub">average the probabilities, then argmax</div>
            </div>
            {names.map((c, k) => (
              <div key={c} class={`voting-calc-trow ${k === soft.winner && !soft.tie ? 'win' : ''}`}>
                <span>{c}</span>
                <Bar value={soft.avg[k]} tone={k === soft.winner ? 'tick' : 'ink'} label={`${c} average ${p2(soft.avg[k])}`} />
                <span class="num">
                  {p2(soft.avg[k])}
                  {k === soft.winner && !soft.tie && <span class="voting-calc-win">wins</span>}
                </span>
              </div>
            ))}
            <div class="voting-calc-calc">
              Sums {soft.sums.map((s) => p2(s)).join(' vs ')}; ÷ {n} → {soft.avg.map((s) => p2(s)).join(', ')}
            </div>
            <div class="voting-calc-res">
              {soft.tie ? 'Tie' : names[soft.winner]}
              <small>{soft.tie ? `${soft.tied.map((k) => names[k]).join(' = ')}` : `average ${p2(soft.avg[soft.winner])}`}</small>
            </div>
          </div>
        </div>
        {agree ? (
          <Fb kind="good">Both rules pick {names[hard.winner]}. Try “Slide FAQ3” or “Confident minority” for cases where they don't.</Fb>
        ) : why ? (
          <Fb kind="hint" mark="≠">
            <b>Hard and soft voting disagree.</b> {why}
          </Fb>
        ) : (
          <Fb kind="info">A tie: change any probability slightly to break it.</Fb>
        )}
      </div>
    </div>
  );
}

function LabelMode({ labels, conf, setLabels, setConf }) {
  const n = labels.length;
  const res = countLabels(labels, ANIMALS);
  const top = conf.reduce((b, v, i) => (v > conf[b] ? i : b), 0);
  const topLabel = labels[top];
  return (
    <div class="voting-calc-grid">
      <div class="voting-calc-left">
        <div class="mx-cap">Each model's output</div>
        <div class="mini-wrap">
          <table class="mini voting-calc-table" aria-label="Predicted label and confidence per model">
            <thead>
              <tr>
                <th class="l">Model</th>
                <th>Label</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}>
                  <th class="l" scope="row">
                    M{i + 1}
                  </th>
                  <td class={l === ANIMALS[res.winner] && !res.tie ? 'voting-calc-top' : ''}>
                    <select
                      class="input voting-calc-sel"
                      aria-label={`M${i + 1} predicted label`}
                      value={l}
                      onChange={(e) => setLabels(labels.map((x, a) => (a === i ? e.currentTarget.value : x)))}
                    >
                      {ANIMALS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Num
                      value={conf[i]}
                      step={0.05}
                      min={0}
                      max={1}
                      width={64}
                      label={`M${i + 1} confidence`}
                      onChange={(x) => setConf(conf.map((c, a) => (a === i ? r4(clamp(x, 0, 1)) : c)))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="faint small">As in the 2024 test: each classifier reports only its decision and one confidence score.</div>
      </div>
      <div class="stack">
        <div class="voting-calc-panels">
          <div class="voting-calc-panel" aria-live="polite">
            <div>
              <div class="voting-calc-ph">Hard voting</div>
              <div class="voting-calc-sub">count the labels</div>
            </div>
            {ANIMALS.map((a, k) => (
              <div key={a} class={`voting-calc-trow ${k === res.winner && !res.tie ? 'win' : ''}`}>
                <span>{a}</span>
                <span class="voting-calc-chips">
                  {labels.map((l, i) =>
                    l === a ? (
                      <span key={i} class="voting-calc-m">
                        M{i + 1}
                      </span>
                    ) : null
                  )}
                </span>
                <span class="num">
                  {res.counts[k]}
                  {k === res.winner && !res.tie && <span class="voting-calc-win">wins</span>}
                </span>
              </div>
            ))}
            <div class="voting-calc-res">
              {res.tie ? 'Tie' : ANIMALS[res.winner]}
              <small>
                {res.tie ? `${res.tied.map((k) => ANIMALS[k]).join(' = ')} (${res.counts[res.winner]} each)` : `${res.counts[res.winner]} of ${n} votes`}
              </small>
            </div>
            {!res.tie && res.counts[res.winner] * 2 <= n && (
              <div class="voting-calc-sub">The most votes wins; it doesn't need to be over half.</div>
            )}
          </div>
          <div class="voting-calc-panel">
            <div>
              <div class="voting-calc-ph">Soft voting</div>
              <div class="voting-calc-sub">average the probabilities, then argmax</div>
            </div>
            <div class="voting-calc-res">Not possible</div>
            <div class="small muted">
              Soft voting averages every model's probability for <i>every</i> class (<code>predict_proba</code>). “M2: Cat, 0.45” doesn't say
              how M2 splits the other 0.55 between Dog, Iguana and Penguin, so there is nothing to average. Adding up the confidences per
              label isn't soft voting either.
            </div>
          </div>
        </div>
        {!res.tie && topLabel !== ANIMALS[res.winner] ? (
          <Fb kind="hint" mark="!">
            Hard voting ignores the confidence scores: M{top + 1} is the most confident ({topLabel}, {fmt(conf[top], 2)}) but it is only one
            vote; {ANIMALS[res.winner]} wins with {res.counts[res.winner]}.
          </Fb>
        ) : (
          <Fb kind="info">Hard voting only counts labels; the confidence scores play no part.</Fb>
        )}
      </div>
    </div>
  );
}
