// Group fairness from two confusion matrices: base rate, TPR, FNR, FPR, precision, accuracy, ratios (W12b s3-7).
import { useState } from 'preact/hooks';
import { WidgetFrame, Btn, Num, Fb } from '../ui.jsx';
import { fmt } from '../lib/svg.js';
import { rates, PRESETS } from './fairness-calc-math.js';

const css = `
.fairness-calc-cms { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
.fairness-calc-cm { border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 10px 12px; background: var(--paper); display: grid; gap: 6px; min-width: 0; }
.fairness-calc-cm h4 { margin: 0; font-size: 14px; }
.fairness-calc-cm table { border-collapse: collapse; font-size: 12.5px; }
.fairness-calc-cm th { font-weight: 700; color: var(--ink-2); padding: 3px 5px; text-align: center; vertical-align: bottom; line-height: 1.25; }
.fairness-calc-cm th.fairness-calc-r { text-align: right; vertical-align: middle; }
.fairness-calc-cm td { padding: 3px; text-align: center; }
.fairness-calc-tag { display: block; font-size: 10.5px; font-weight: 700; color: var(--ink-3); letter-spacing: 0.04em; }
.fairness-calc-rates td.fairness-calc-k { text-align: left; }
.fairness-calc-rates .fairness-calc-f { display: block; font-size: 11.5px; color: var(--ink-3); font-weight: 400; }
.fairness-calc-says { margin: 0; padding-left: 20px; display: grid; gap: 4px; font-size: 14px; }
`;

const pc = (v) => (Number.isFinite(v) ? fmt(v * 100, 1) + '%' : '–');
const ROWS = [
  { k: 'base', name: 'Base rate', sub: 'actual positives: (TP + FN) / N' },
  { k: 'tpr', name: 'TPR (recall)', sub: 'TP / (TP + FN)' },
  { k: 'fnr', name: 'FNR', sub: 'FN / (TP + FN) = 1 − TPR' },
  { k: 'fpr', name: 'FPR', sub: 'FP / (FP + TN)' },
  { k: 'ppv', name: 'Precision (PPV)', sub: 'TP / (TP + FP)' },
  { k: 'acc', name: 'Accuracy', sub: '(TP + TN) / N' },
];

function ratio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return { r: lo > 0 ? hi / lo : Infinity, hiIdx: a >= b ? 0 : 1 };
}

export default function FairnessCalc({ preset = 'sweden' }) {
  const [pk, setPk] = useState(PRESETS[preset] ? preset : 'sweden');
  const P = PRESETS[pk];
  const [groups, setGroups] = useState(P.groups);
  const load = (k) => {
    setPk(k);
    setGroups(PRESETS[k].groups);
  };
  const R = groups.map(rates);
  const setCell = (g, key, v) => setGroups(groups.map((m, i) => (i === g ? { ...m, [key]: Math.max(0, Math.round(v)) } : m)));
  const edited = groups.some((m, i) => ['tn', 'fp', 'fn', 'tp'].some((key) => m[key] !== P.groups[i][key]));
  const fnrR = ratio(R[0].fnr, R[1].fnr);
  const fprR = ratio(R[0].fpr, R[1].fpr);
  const ppvR = ratio(R[0].ppv, R[1].ppv);
  const xr = (o) => (o == null ? '–' : o.r === Infinity ? '∞' : '×' + fmt(o.r, 2));
  const cell = (g, key, tag) => (
    <td>
      <span class="fairness-calc-tag">{tag}</span>
      <Num value={groups[g][key]} min={0} step={10} width={70} label={`${P.names[g]} ${tag}`} onChange={(v) => setCell(g, key, v)} />
    </td>
  );

  return (
    <WidgetFrame
      title="Group fairness from confusion matrices"
      lead="Load a lecture example or edit the counts, then compare each rate between the two groups. Highlighted rows differ by 25% or more."
      actions={Object.entries(PRESETS).map(([k, v]) => (
        <Btn size="sm" key={k} kind={k === pk && !edited ? 'primary' : ''} onClick={() => load(k)}>
          {v.label}
        </Btn>
      ))}
      foot={
        <span>
          “Fair” depends on which rate you equalise. When base rates differ you cannot make precision, TPR and FPR all equal at once (only a
          perfect model could). COMPAS: precision is similar (63% vs 59.1%), yet the FPR is almost twice as high for black defendants.
        </span>
      }
    >
      <style>{css}</style>
      <div class="fairness-calc-cms">
        {[0, 1].map((g) => (
          <div class="fairness-calc-cm" key={g}>
            <h4>{P.names[g]}</h4>
            <div class="mini-wrap">
              <table aria-label={`${P.names[g]} confusion matrix`}>
                <thead>
                  <tr>
                    <th />
                    <th>
                      {P.neg}
                      <br />
                      (y = −1)
                    </th>
                    <th>
                      {P.pos}
                      <br />
                      (y = 1)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th class="fairness-calc-r">
                      {P.predNeg}
                      <br />
                      (ŷ = −1)
                    </th>
                    {cell(g, 'tn', 'TN')}
                    {cell(g, 'fn', 'FN')}
                  </tr>
                  <tr>
                    <th class="fairness-calc-r">
                      {P.predPos}
                      <br />
                      (ŷ = 1)
                    </th>
                    {cell(g, 'fp', 'FP')}
                    {cell(g, 'tp', 'TP')}
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="faint small">N = {R[g].n.toLocaleString('en-US')}</div>
          </div>
        ))}
      </div>

      <div class="mini-wrap">
        <table class="mini fairness-calc-rates" aria-live="polite">
          <thead>
            <tr>
              <th class="l">Rate</th>
              <th>{P.names[0]}</th>
              <th>{P.names[1]}</th>
              <th>ratio</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const a = R[0][row.k];
              const b = R[1][row.k];
              const o = ratio(a, b);
              const big = o && o.r >= 1.25;
              return (
                <tr key={row.k} class={big ? 'hl' : ''}>
                  <td class="fairness-calc-k">
                    <b>{row.name}</b>
                    <span class="fairness-calc-f">{row.sub}</span>
                  </td>
                  <td>{big && o.hiIdx === 0 ? <b>{pc(a)}</b> : pc(a)}</td>
                  <td>{big && o.hiIdx === 1 ? <b>{pc(b)}</b> : pc(b)}</td>
                  <td>{xr(o)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul class="fairness-calc-says">
        {fnrR && (
          <li>
            Among actual positives ({P.pos}), <b>{P.names[fnrR.hiIdx]}</b> are {xr(fnrR).replace('×', '')}× as likely to get “{P.predNeg}” (FNR{' '}
            {pc(R[fnrR.hiIdx].fnr)} vs {pc(R[1 - fnrR.hiIdx].fnr)}).
          </li>
        )}
        {fprR && (
          <li>
            Among actual negatives ({P.neg}), <b>{P.names[fprR.hiIdx]}</b> are {xr(fprR).replace('×', '')}× as likely to get “{P.predPos}” (FPR{' '}
            {pc(R[fprR.hiIdx].fpr)} vs {pc(R[1 - fprR.hiIdx].fpr)}).
          </li>
        )}
        {ppvR && (
          <li>
            Precision: {pc(R[0].ppv)} vs {pc(R[1].ppv)} ({xr(ppvR)}), base rates {pc(R[0].base)} vs {pc(R[1].base)}.
          </li>
        )}
      </ul>

      <Fb kind="info">
        Equal precision <b>and</b> TPR <b>and</b> FPR for both groups is impossible unless the model is perfect or both groups have the same
        base rate p, because FPR = p/(1 − p) · (1 − PPV)/PPV · TPR.
      </Fb>
      {pk === 'compas' && !edited && (
        <div class="faint small">
          Slide check: these counts give white FPR 23.45% and TPR 52.28% (the slide prints 23.4% and 52.2%) and a white reoffending rate of
          966 / 2,454 = 39.4% (the slide prints 39.2%). The black-defendant figures match the slide.
        </div>
      )}
    </WidgetFrame>
  );
}
