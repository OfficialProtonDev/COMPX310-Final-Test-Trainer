// Bootstrap sampling, pasting and out-of-bag instances (W7 s9-14, FAQ1, FAQ4).
import { useState, useMemo, useRef } from 'preact/hooks';
import { WidgetFrame, Seg, Slider, Btn, Fb, Readout, Plot, Chip } from '../ui.jsx';
import { fmt, fix, pct, linePath, clamp, range } from '../lib/svg.js';
import { drawBag, bagStats, expectedOob, bagSeed } from './bootstrap-oob-math.js';
import { useBoxWidth } from './w7-shared.js';

const M = 100; // training instances, shown as a 10 x 10 grid
const MAX_BAGS = 2000;
const M_STEPS = [10, 20, 30, 50, 100, 200, 300, 500, 1000];
const SLIDE = [36, 37, 20, 5, 2]; // FAQ4: missing, once, twice, 3 times, 4 times

// bag 0 of plain bagging (100 draws from 100) is the slide's bag; other settings get their own seed streams
const salt = (mode, size) => (mode === 'bag' && size === M ? 0 : (mode === 'bag' ? 1000 : 2000) + size);
const newBag = (mode, size, i) => drawBag(M, size, bagSeed(i, salt(mode, size)), mode === 'bag');

const css = `
.bootstrap-oob-main { display: grid; gap: 16px; align-items: start; }
@media (min-width: 760px) { .bootstrap-oob-main { grid-template-columns: minmax(0, 340px) minmax(0, 1fr); } }
.bootstrap-oob-gridwrap { display: grid; gap: 8px; min-width: 0; max-width: 340px; }
.bootstrap-oob-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; }
.bootstrap-oob-cell {
  all: unset; box-sizing: border-box; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; border: 1px solid transparent; font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px;
  font-weight: 700; cursor: pointer; color: var(--ink); min-width: 0;
}
.bootstrap-oob-cell.c0 { background: repeating-linear-gradient(135deg, var(--paper-3) 0 3px, var(--paper) 3px 6px); border: 1px dashed var(--rule-2); color: var(--ink-2); font-weight: 400; }
.bootstrap-oob-cell.c1 { background: var(--c1-soft); }
.bootstrap-oob-cell.c2 { background: var(--c1-soft); background: color-mix(in srgb, var(--c1) 45%, var(--paper)); }
.bootstrap-oob-cell.c3 { background: var(--c1); color: var(--on-biro); }
.bootstrap-oob-cell.sel { outline: 2.5px solid var(--ink); outline-offset: 1px; }
.bootstrap-oob-cell:focus-visible { outline: 2.5px solid var(--biro); outline-offset: 1px; }
.bootstrap-oob-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12.5px; color: var(--ink-2); align-items: center; }
.bootstrap-oob-legend .bootstrap-oob-cell { width: 20px; height: 20px; font-size: 11px; cursor: default; margin-right: 4px; vertical-align: middle; display: inline-flex; }
.bootstrap-oob-side { display: grid; gap: 12px; min-width: 0; align-content: start; }
.bootstrap-oob-side .readouts { grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); }
.bootstrap-oob-lower { display: grid; gap: 16px; align-items: start; }
@media (min-width: 760px) { .bootstrap-oob-lower { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); } }
.bootstrap-oob-panel { border: 1px solid var(--rule); border-radius: var(--r-sm); background: var(--paper-2); padding: 10px 12px; display: grid; gap: 8px; min-width: 0; }
.bootstrap-oob-formula { font-family: var(--font-math); font-size: 19px; color: var(--ink); }
.bootstrap-oob-formula b { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 15px; }
svg.plot.bootstrap-oob-plot { touch-action: auto; }
.bootstrap-oob-plot .bootstrap-oob-dot { fill: var(--ink-3); opacity: 0.45; }
.bootstrap-oob-plot .bootstrap-oob-avg { fill: none; stroke: var(--biro); stroke-width: 2.5; stroke-linejoin: round; }
.bootstrap-oob-plot .bootstrap-oob-exp { stroke: var(--tick); stroke-width: 1.5; stroke-dasharray: 6 4; }
svg.plot .bootstrap-oob-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
`;

export default function BootstrapOob() {
  const [mode, setMode] = useState('bag');
  const [size, setSize] = useState(M);
  const [bags, setBags] = useState(() => [newBag('bag', M, 0)]);
  const [sel, setSel] = useState(() => bags[0].indexOf(0)); // start on an out-of-bag instance
  const [mi, setMi] = useState(M_STEPS.indexOf(100));
  const gridRef = useRef(null);
  const [ref, w] = useBoxWidth(420);
  const h = Math.round(clamp(w * 0.56, 210, 300));

  const replace = mode === 'bag';
  const restart = (md, sz) => setBags([newBag(md, sz, 0)]);
  const changeMode = (md) => {
    const sz = md === 'bag' ? M : 60;
    setMode(md);
    setSize(sz);
    restart(md, sz);
  };
  const changeSize = (sz) => {
    setSize(sz);
    restart(mode, sz);
  };
  const draw = (k) =>
    setBags((old) => {
      const add = [];
      for (let j = 0; j < k && old.length + j < MAX_BAGS; j++) add.push(newBag(mode, size, old.length + j));
      return old.concat(add);
    });

  const cur = bags[bags.length - 1];
  const B = bags.length;
  const st = bagStats(cur);
  const fracs = useMemo(() => bags.map((b) => b.reduce((s, c) => s + (c === 0 ? 1 : 0), 0) / M), [bags]);
  const runAvg = useMemo(() => {
    let s = 0;
    return fracs.map((f, i) => (s += f) / (i + 1));
  }, [fracs]);
  const oobCount = useMemo(() => {
    const o = new Array(M).fill(0);
    bags.forEach((b) => b.forEach((c, i) => c === 0 && o[i]++));
    return o;
  }, [bags]);
  const expOob = expectedOob(M, size, replace);
  const isSlide = replace && size === M && st.hist.length === SLIDE.length && SLIDE.every((v, i) => st.hist[i] === v);
  const mForm = M_STEPS[mi];
  const qm = Math.pow(1 - 1 / mForm, mForm);
  const threePlus = st.hist.slice(3).map((c, j) => (c ? `${c} × ${j + 3}` : '')).filter(Boolean).join(', ');

  const onKey = (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10, Home: -sel, End: M - 1 - sel }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const ni = clamp(sel + d, 0, M - 1);
    setSel(ni);
    const el = gridRef.current && gridRef.current.querySelector(`[data-i="${ni}"]`);
    if (el) el.focus();
  };

  const lo = clamp(Math.floor((expOob - 0.15) * 20) / 20, 0, 1);
  const hi = clamp(Math.ceil((expOob + 0.15) * 20) / 20, 0, 1);
  const yTicks = [];
  for (let t = Math.ceil(lo * 10 - 1e-9); t <= Math.floor(hi * 10 + 1e-9); t++) yTicks.push(t / 10);

  return (
    <WidgetFrame
      title="Bootstrap sampling and out-of-bag instances"
      lead="Draw bags of 100 from 100 training instances with replacement; count how many never get picked, then draw many bags to see the average settle."
      foot={
        <span>
          A bootstrap bag (m draws with replacement) leaves out about (1 − 1/m)^m ≈ e⁻¹ ≈ 37% of the instances, so it holds about 63%
          distinct ones: roughly two-thirds in, one-third out. Those out-of-bag instances give every predictor a free validation set
          (<code>oob_score=True</code>). Pasting samples without replacement, so its bags must be smaller than m.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-row">
        <Seg
          label="Sampling"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'bag', label: 'Bagging', title: 'Sampling with replacement (bootstrap=True)' },
            { value: 'paste', label: 'Pasting', title: 'Sampling without replacement (bootstrap=False)' },
          ]}
        />
        <div class="row" style={{ gap: '6px' }}>
          <Btn size="sm" kind="primary" onClick={() => draw(1)} disabled={B >= MAX_BAGS}>
            Draw a bag
          </Btn>
          <Btn size="sm" onClick={() => draw(100)} disabled={B >= MAX_BAGS}>
            Draw 100 bags
          </Btn>
          <Btn size="sm" kind="ghost" onClick={() => restart(mode, size)}>
            Reset
          </Btn>
        </div>
      </div>
      <div class="faint small" style={{ marginTop: '-6px' }}>
        Bagging samples with replacement (<code>bootstrap=True</code>); pasting samples without (<code>bootstrap=False</code>).
      </div>
      <div class="bootstrap-oob-main">
        <div class="bootstrap-oob-gridwrap">
          <div class="mx-cap">
            Bag {B}: how often each instance was drawn{B > 1 ? ' (latest bag)' : ''}
          </div>
          <div class="bootstrap-oob-grid" ref={gridRef} role="group" aria-label="100 training instances; arrow keys move between them">
            {range(M).map((i) => {
              const k = cur[i];
              return (
                <button
                  key={i}
                  type="button"
                  data-i={i}
                  class={`bootstrap-oob-cell c${Math.min(k, 3)} ${i === sel ? 'sel' : ''}`}
                  tabIndex={i === sel ? 0 : -1}
                  aria-pressed={i === sel}
                  aria-label={`Instance ${i}: ${k === 0 ? 'out of bag' : `drawn ${k} time${k > 1 ? 's' : ''}`}`}
                  onClick={() => setSel(i)}
                  onKeyDown={onKey}
                >
                  {k === 0 ? '○' : k}
                </button>
              );
            })}
          </div>
          <div class="bootstrap-oob-legend" aria-hidden="true">
            <span>
              <span class="bootstrap-oob-cell c0">○</span>out-of-bag
            </span>
            <span>
              <span class="bootstrap-oob-cell c1">1</span>once
            </span>
            <span>
              <span class="bootstrap-oob-cell c2">2</span>twice
            </span>
            <span>
              <span class="bootstrap-oob-cell c3">3</span>3+ times
            </span>
          </div>
        </div>
        <div class="bootstrap-oob-side">
          <Slider
            label="Bag size (max_samples)"
            value={size}
            min={10}
            max={replace ? 200 : 100}
            step={10}
            onInput={changeSize}
            format={(v) => `${v} of ${M}`}
          />
          <div class="readouts" aria-live="polite">
            <Readout label="Out-of-bag" value={st.missing} sub={`never drawn (${pct(st.oobFrac, 0)})`} tone="blue" />
            <Readout label="Once" value={st.once} />
            <Readout label="Twice" value={st.twice} />
            <Readout label="3+ times" value={st.more} sub={threePlus || '—'} />
          </div>
          <div class="small muted">
            Distinct instances in this bag: <b>{st.unique}</b> of {M}. Expected out-of-bag:{' '}
            {replace ? (
              <span>
                (1 − 1/{M})<sup>{size}</sup> = {pct(expOob, 1)}
              </span>
            ) : (
              <span>
                1 − {size}/{M} = {pct(expOob, 0)}
              </span>
            )}
            .
          </div>
          {replace && size === M && (
            <div class="row small" style={{ gap: '6px' }}>
              <span class="faint">Slide FAQ4: missing 36, once 37, twice 20, 3× 5, 4× 2</span>
              {isSlide && <Chip kind="good">✓ same as this bag</Chip>}
            </div>
          )}
          {!replace &&
            (size >= M ? (
              <Fb kind="bad">
                A pasting bag of size m is the whole training set: every predictor would see identical data, so there is no diversity and
                nothing is out-of-bag. Pasting needs max_samples &lt; m.
              </Fb>
            ) : (
              <Fb kind="info">
                Pasting (<code>bootstrap=False</code>): no duplicates, so each bag leaves out exactly m − {size} = {M - size} instances.
                The bag must be smaller than m (bagging can be any size; its default is m).
              </Fb>
            ))}
          <div class="bootstrap-oob-panel" aria-live="polite">
            <div class="mx-cap" style={{ margin: 0 }}>
              Instance {sel}
            </div>
            <div class="small">
              {cur[sel] === 0 ? (
                <span>
                  <b>Out-of-bag</b> in the latest bag.
                </span>
              ) : (
                <span>
                  In the latest bag <b>{cur[sel]}×</b>.
                </span>
              )}{' '}
              Out-of-bag in <b>{oobCount[sel]}</b> of {B} bag{B > 1 ? 's' : ''} ({pct(oobCount[sel] / B, 0)}):{' '}
              {oobCount[sel] === 0
                ? 'no predictor can score it out-of-bag yet.'
                : oobCount[sel] === 1
                ? 'in OOB evaluation only that one predictor votes on it.'
                : `in OOB evaluation only those ${oobCount[sel]} predictors vote on it.`}
            </div>
          </div>
        </div>
      </div>
      <div class="bootstrap-oob-lower">
        <div class="wg-plot">
          <div class="mx-cap" style={{ margin: 0 }}>
            Out-of-bag fraction per bag and running average ({B} bag{B > 1 ? 's' : ''})
          </div>
          <div ref={ref}>
            <Plot
              w={w}
              h={h}
              x={[1, Math.max(10, B)]}
              y={[lo, hi]}
              yTicks={yTicks}
              pad={{ l: 44, r: 14, t: 12, b: 36 }}
              xLabel="bags drawn"
              yFmt={(v) => pct(v, 0)}
              xFmt={(v) => fmt(v, 0)}
              class="bootstrap-oob-plot"
              label={`Out-of-bag fraction of each bag; running average ${pct(runAvg[B - 1], 1)} after ${B} bags`}
            >
              {({ X, Y, w: W, pad }) => (
                <g>
                  <line class="bootstrap-oob-exp" x1={pad.l} x2={W - pad.r} y1={Y(expOob)} y2={Y(expOob)} />
                  {B <= 600 && fracs.map((f, i) => <circle key={i} class="bootstrap-oob-dot" cx={X(i + 1)} cy={Y(clamp(f, lo, hi))} r="2.4" />)}
                  {B > 1 && <path class="bootstrap-oob-avg" d={linePath(runAvg.map((v, i) => [i + 1, v]), X, Y)} />}
                  <circle cx={X(B)} cy={Y(runAvg[B - 1])} r="4.5" fill="var(--paper)" stroke="var(--biro)" stroke-width="2.5" />
                  <text
                    class="lbl-strong bootstrap-oob-halo"
                    x={X(B) - (B > 5 ? 8 : -8)}
                    y={Y(runAvg[B - 1]) + (runAvg[B - 1] > (lo + hi) / 2 ? 22 : -14)}
                    text-anchor={B > 5 ? 'end' : 'start'}
                  >
                    average {pct(runAvg[B - 1], 1)}
                  </text>
                </g>
              )}
            </Plot>
          </div>
          <div class="wg-legend">
            <span>
              <span class="sw" style={{ background: 'var(--ink-3)', opacity: 0.6 }} />
              dots: each bag
            </span>
            <span>
              <span class="sw" style={{ background: 'var(--biro)' }} />
              running average {pct(runAvg[B - 1], 1)}
            </span>
            <span>
              <span class="sw" style={{ background: 'var(--tick)' }} />
              dashed: expected {pct(expOob, 1)}
              {replace && size === M ? ' (e⁻¹ = 36.8% as m grows)' : ''}
            </span>
          </div>
          {B === 1 && <div class="plot-tip">Press “Draw 100 bags”: single bags scatter, the average settles on the dashed line.</div>}
        </div>
        <div class="stack">
          <div class="bootstrap-oob-panel">
            <div class="mx-cap" style={{ margin: 0 }}>
              Chance an instance is never drawn
            </div>
            <Slider label="Training set size m (bag of m draws)" value={mi} min={0} max={M_STEPS.length - 1} step={1} onInput={setMi} format={(i) => String(M_STEPS[i])} />
            <div class="bootstrap-oob-formula">
              (1 − 1/{mForm})<sup>{mForm}</sup> = <b>{fix(qm, 4)}</b>
            </div>
            <div class="small muted">
              → e⁻¹ = 0.3679 as m grows. So a bag holds about 1 − e⁻¹ = <b>63.2%</b> of the distinct instances (the slide's “about 67%
              unique” is the same idea, loosely rounded). With 1000 trees, each instance is out-of-bag for about {Math.round(1000 * qm)} of
              them (slide: ≈ 330).
            </div>
          </div>
          <Fb kind="info">
            <b>OOB evaluation:</b> each instance is predicted only by the predictors that never saw it, and those predictions are compared
            with its label: “almost like a validation set for free”. <code>BaggingClassifier(…, oob_score=True)</code> →{' '}
            <code>oob_score_</code> (slide s14: 0.901 vs test accuracy 0.912).
          </Fb>
        </div>
      </div>
    </WidgetFrame>
  );
}
