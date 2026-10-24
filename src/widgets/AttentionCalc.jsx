// Scaled dot-product attention with the lecture's drinks example, masked self-attention, and d_k = d_model / h (W11 s14-28).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Num, Btn, Fb, Readout } from '../ui.jsx';
import { fmt } from '../lib/svg.js';
import { attend, DRINKS, SENT, SENT_SCORES, selfAttention } from './attention-calc-math.js';
import { Check } from './c-helpers.jsx';

const css = `
.attention-calc-in { border-collapse: collapse; font-size: 13.5px; }
.attention-calc-in th { font-size: 12px; font-weight: 700; color: var(--ink-3); text-align: center; padding: 2px 4px; }
.attention-calc-in td { padding: 2px 4px; }
.attention-calc-in td.attention-calc-n { font-weight: 700; color: var(--ink-2); white-space: nowrap; padding-right: 8px; }
.attention-calc-cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); }
.attention-calc-card { border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 10px 12px; display: grid; gap: 8px; background: var(--paper); min-width: 0; }
.attention-calc-card h4 { margin: 0; font-size: 14px; }
.attention-calc-mix { display: flex; height: 30px; border-radius: 6px; overflow: hidden; border: 1px solid var(--rule-2); }
.attention-calc-mix span { display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; color: var(--paper); white-space: nowrap; overflow: hidden; min-width: 0; }
.attention-calc-heat { border-collapse: collapse; font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.attention-calc-heat th { font-family: var(--font-ui); font-size: 12px; font-weight: 700; color: var(--ink-2); padding: 3px 5px; }
.attention-calc-heat th.attention-calc-q { text-align: right; }
.attention-calc-heat td { position: relative; width: 46px; height: 30px; text-align: center; border: 1px solid var(--rule); padding: 0; }
.attention-calc-heat td .attention-calc-bg { position: absolute; inset: 0; background: var(--biro); }
.attention-calc-heat td .attention-calc-v { position: relative; }
.attention-calc-heat td.attention-calc-masked { background-color: var(--paper-3); background-image: repeating-linear-gradient(45deg, var(--rule-2) 0 1px, transparent 1px 6px); color: var(--ink-2); }
.attention-calc-heat tr.hl th.attention-calc-q { color: var(--marker); }
.attention-calc-two { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
.attention-calc-cap { font-size: 12.5px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.attention-calc-sec { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--ink-2); }
.attention-calc-hr { border: 0; border-top: 1px dashed var(--rule-2); margin: 2px 0; width: 100%; }
`;

const JUICE = { apple: 'var(--c3)', lemon: 'var(--c4)', orange: 'var(--c2)' };
const f3 = (v) => fmt(v, 3);
const term = (v) => (v < 0 ? `(${fmt(v, 2)})` : fmt(v, 2));

export default function AttentionCalc() {
  const [queries, setQueries] = useState(DRINKS.queries);
  const [keys, setKeys] = useState(DRINKS.keys);
  const [dk, setDk] = useState(DRINKS.dk);
  const [causal, setCausal] = useState(true);
  const [dModel, setDModel] = useState(512);
  const [heads, setHeads] = useState(8);

  const res = useMemo(() => queries.map((q) => attend(q.v, keys.map((k) => k.v), dk)), [queries, keys, dk]);
  const W = useMemo(() => selfAttention(SENT_SCORES, causal), [causal]);
  const Wfree = useMemo(() => selfAttention(SENT_SCORES, false), []);
  const has3 = keys.length > 2;

  const setVec = (list, set, i, c, v) => set(list.map((it, j) => (j === i ? { ...it, v: it.v.map((x, cc) => (cc === c ? v : x)) } : it)));
  const reset = () => {
    setQueries(DRINKS.queries);
    setKeys(DRINKS.keys);
    setDk(DRINKS.dk);
  };
  const dkHead = dModel / heads;

  return (
    <WidgetFrame
      title="Scaled dot-product attention"
      lead="Follow each query through q·k, ÷ √d_k and softmax to the mix of values it gets. Edit any number; the lecture example is loaded."
      actions={[
        <Btn size="sm" key="r" onClick={reset}>
          Lecture example
        </Btn>,
        <Btn
          size="sm"
          key="o"
          class="attention-calc-third"
          onClick={() => setKeys((ks) => (ks.length > 2 ? ks.slice(0, 2) : [...ks, DRINKS.extra]))}
        >
          {has3 ? 'Remove orange' : 'Add a third juice'}
        </Btn>,
      ]}
      foot={
        <span>
          Attention(Q, K, V) = softmax(QKᵀ / √d_k) · V: a weighted average of the values, weighted by how well each key matches the query.
          GPT-style decoders mask future positions (score −∞, weight 0); multi-head attention runs h heads with d_k = d_v = d_model / h to
          attend to several things at once.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <table class="attention-calc-in" aria-label="Queries and keys">
            <thead>
              <tr>
                <th />
                <th>sweet</th>
                <th>sour</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q, i) => (
                <tr key={'q' + i}>
                  <td class="attention-calc-n">{q.name} (query)</td>
                  {q.v.map((x, c) => (
                    <td key={c}>
                      <Num value={x} step={0.1} width={58} label={`${q.name} ${c ? 'sour' : 'sweet'}`} onChange={(v) => setVec(queries, setQueries, i, c, v)} />
                    </td>
                  ))}
                </tr>
              ))}
              {keys.map((k, i) => (
                <tr key={'k' + i}>
                  <td class="attention-calc-n">
                    <span style={{ color: JUICE[k.name] }}>■</span> {k.name} (key)
                  </td>
                  {k.v.map((x, c) => (
                    <td key={c}>
                      <Num value={x} step={0.1} width={58} label={`${k.name} key ${c ? 'sour' : 'sweet'}`} onChange={(v) => setVec(keys, setKeys, i, c, v)} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td class="attention-calc-n">d_k</td>
                <td>
                  <Num value={dk} step={1} min={1} width={58} label="d_k" onChange={(v) => v > 0 && setDk(v)} />
                </td>
                <td class="faint small" style={{ paddingLeft: '6px' }}>
                  √d_k = {fmt(Math.sqrt(dk), 3)}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="wg-note">
            Dimension 1 = sweetness, 2 = sourness. Each key belongs to a value (the juice); d_k is the length of the keys (2 here).
          </div>
        </div>
        <div class="attention-calc-cards">
          {queries.map((q, i) => {
            const r = res[i];
            return (
              <div class="attention-calc-card" key={q.name}>
                <h4>
                  {q.name}'s drink, q = [{q.v.map((x) => fmt(x, 2)).join(', ')}]
                </h4>
                <div class="calc-steps" aria-live="polite">
                  {keys.map((k, j) => (
                    <div key={j}>
                      q·k<sub>{k.name}</sub> = {q.v.map((x, c) => `${term(x)}·${term(k.v[c])}`).join(' + ')} = {fmt(r.dots[j], 3)}
                    </div>
                  ))}
                  <div>
                    ÷ √{fmt(dk, 2)} → [{r.scaled.map(f3).join(', ')}]
                  </div>
                  <div>
                    softmax → [{r.weights.map(f3).join(', ')}]
                  </div>
                </div>
                <div class="attention-calc-mix" role="img" aria-label={keys.map((k, j) => `${fmt(r.weights[j] * 100, 1)}% ${k.name}`).join(', ')}>
                  {keys.map((k, j) => (
                    <span key={j} style={{ width: r.weights[j] * 100 + '%', background: JUICE[k.name] }}>
                      {r.weights[j] > 0.2 ? `${fmt(r.weights[j] * 100, 1)}% ${k.name}` : ''}
                    </span>
                  ))}
                </div>
                <div class="small">
                  = {keys.map((k, j) => `${fmt(r.weights[j] * 100, 1)}% ${k.name}`).join(' + ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr class="attention-calc-hr" />
      <div class="attention-calc-sec">Masked self-attention: “I ate an apple today”</div>
      <div class="wg-row">
        <Check checked={causal} onChange={setCausal}>
          Causal mask (GPT-style decoder): hide future words
        </Check>
      </div>
      <div class="attention-calc-two">
        <div class="mini-wrap">
          <div class="attention-calc-cap">Scores q·k / √d_k {causal ? '(masked → −∞)' : ''}</div>
          <table class="attention-calc-heat" aria-label="Attention scores">
            <thead>
              <tr>
                <th />
                {SENT.map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SENT_SCORES.map((row, i) => (
                <tr key={i} class={i === 1 ? 'hl' : ''}>
                  <th class="attention-calc-q">{SENT[i]}</th>
                  {row.map((s, j) => {
                    const m = causal && j > i;
                    return (
                      <td key={j} class={m ? 'attention-calc-masked' : ''}>
                        <span class="attention-calc-v">{m ? '−∞' : fmt(s, 1)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="mini-wrap">
          <div class="attention-calc-cap">Weights = softmax of each row</div>
          <table class="attention-calc-heat" aria-label="Attention weights">
            <thead>
              <tr>
                <th />
                {SENT.map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {W.map((row, i) => (
                <tr key={i} class={i === 1 ? 'hl' : ''}>
                  <th class="attention-calc-q">{SENT[i]}</th>
                  {row.map((wv, j) => {
                    const m = causal && j > i;
                    return (
                      <td key={j} class={m ? 'attention-calc-masked' : ''} style={{ color: !m && wv >= 0.62 ? 'var(--on-biro)' : undefined }}>
                        {!m && <span class="attention-calc-bg" style={{ opacity: Math.min(0.88, wv * 1.1) }} />}
                        <span class="attention-calc-v">{fmt(wv, 2)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Fb kind={causal ? 'good' : 'hint'}>
        {causal ? (
          <span>
            With the mask, “ate” can only use “I” and itself ({fmt(W[1][0], 2)} / {fmt(W[1][1], 2)}); every row still sums to 1. This is
            what lets a decoder generate text one word at a time.
          </span>
        ) : (
          <span>
            Without the mask, “ate” puts {fmt(Wfree[1][3] * 100, 0)}% of its attention on “apple”, a word that comes later. Fine for a
            bidirectional encoder (BERT), but a GPT-style decoder must not see the future.
          </span>
        )}
      </Fb>

      <hr class="attention-calc-hr" />
      <div class="attention-calc-sec">Multi-head attention: size of each head</div>
      <div class="wg-row">
        <label class="small" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          d_model <Num value={dModel} step={64} min={1} width={76} label="d_model" onChange={(v) => v > 0 && setDModel(Math.round(v))} />
        </label>
        <label class="small" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          heads h <Num value={heads} step={1} min={1} width={64} label="number of heads" onChange={(v) => v > 0 && setHeads(Math.round(v))} />
        </label>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <Readout
            label="d_k = d_v = d_model / h"
            value={Number.isInteger(dkHead) ? `${dModel} / ${heads} = ${dkHead}` : `${dModel} / ${heads} = ${fmt(dkHead, 2)}`}
            sub={Number.isInteger(dkHead) ? `${heads} heads × ${dkHead} = ${dModel}: about the cost of one full-size head` : 'not a whole number: choose h that divides d_model'}
            tone={Number.isInteger(dkHead) ? 'blue' : 'bad'}
          />
        </div>
      </div>
    </WidgetFrame>
  );
}
