// DBSCAN core / border / outlier labelling with ε and min_samples, plus the 2019 paper Q53 as a quiz (W10b s32-37).
import { useState, useMemo, useRef } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Readout, Fb } from '../ui.jsx';
import { fmt, scale, svgPoint } from '../lib/svg.js';
import { dbscan, EXAM_POINTS, EXAM_EPS, makeMoons, makeBlobsNoise } from './dbscan-lab-math.js';
import { useWidth, equalDomain, Check, CL, CL_SOFT } from './c-helpers.jsx';

const css = `
.dbscan-lab-pts { display: flex; flex-wrap: wrap; gap: 6px; }
.dbscan-lab-pts .btn { min-width: 64px; font-family: var(--font-mono); font-stretch: 87.5%; }
.dbscan-lab-pts .btn.dbscan-lab-ok { border-color: var(--tick); color: var(--tick); }
.dbscan-lab-pts .btn.dbscan-lab-no { border-color: var(--marker); color: var(--marker); }
.dbscan-lab-explain { font-size: 13.5px; color: var(--ink-2); min-height: 1.5em; }
.dbscan-lab-plot { cursor: pointer; }
`;

const PRESETS = {
  moons: { label: 'Two moons', make: () => makeMoons(100, 0.07, 2), eps: 0.25, ms: 5, er: [0.05, 0.6, 0.01], box: [[-1.35, 2.4], [-0.9, 1.35]] },
  blobs: { label: 'Blobs + noise', make: () => makeBlobsNoise(12), eps: 0.2, ms: 5, er: [0.05, 0.6, 0.01], box: [[-1.45, 1.45], [-1.1, 1.3]] },
  exam2019: { label: '2019 paper Q53', make: () => EXAM_POINTS, eps: EXAM_EPS, ms: 2, er: [0.5, 4, 0.1], box: [[-1.7, 13.8], [-0.6, 6.6]] },
};
const KIND = { C: 'core', B: 'border', O: 'outlier' };
const CYCLE = { null: 'C', C: 'B', B: 'O', O: 'C' };
// where each exam point's name goes (P5-P7 are close together): [dx, dy, anchor] in units of the marker radius
const EXAM_LBL = [
  [-1.4, 0.4, 'end'],
  [0, -1.5, 'middle'],
  [1.4, 0.4, 'start'],
  [-1.4, 0.4, 'end'],
  [0, 2.3, 'middle'],
  [1.4, 0.4, 'start'],
  [1.4, 0.4, 'start'],
];

export default function DbscanLab({ preset: initial = 'moons' }) {
  const [preset, setPreset] = useState(PRESETS[initial] ? initial : 'moons');
  const P = PRESETS[preset];
  const pts = useMemo(() => P.make(), [preset]);
  const exam = preset === 'exam2019';
  const [eps, setEps] = useState(P.eps);
  const [ms, setMs] = useState(P.ms);
  const [self, setSelf] = useState(true);
  const [circles, setCircles] = useState(exam);
  const [quiz, setQuiz] = useState(exam);
  const [guess, setGuess] = useState(() => Array(pts.length).fill(null));
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sel, setSel] = useState(exam ? 3 : null);

  const r = useMemo(() => dbscan(pts, eps, ms, self), [pts, eps, ms, self]);
  const name = (i) => (exam ? `P${i + 1}` : `#${i + 1}`);
  const hideTruth = quiz && !revealed;

  const load = (k) => {
    const Q = PRESETS[k];
    setPreset(k);
    setEps(Q.eps);
    setMs(Q.ms);
    setCircles(k === 'exam2019');
    setQuiz(k === 'exam2019');
    setGuess(Array(Q.make().length).fill(null));
    setChecked(false);
    setRevealed(false);
    setSel(k === 'exam2019' ? 3 : null);
  };
  const resetCheck = () => {
    setChecked(false);
    setRevealed(false);
  };
  const cycle = (i) => {
    setGuess((g) => g.map((v, j) => (j === i ? CYCLE[v] : v)));
    setChecked(false);
  };
  const nRight = guess.filter((g, i) => g === r.kind[i]).length;

  // plot geometry: equal aspect so ε circles are round
  const [ref, w] = useWidth(400);
  const pad = { l: 34, r: 10, t: 10, b: 28 };
  const iw = w - pad.l - pad.r;
  const [bx, by] = P.box;
  const h = Math.round(Math.max(exam ? 170 : 220, Math.min(380, (iw * (by[1] - by[0])) / (bx[1] - bx[0]) + pad.t + pad.b)));
  const [xd, yd] = equalDomain(bx, by, iw, h - pad.t - pad.b);
  const Xs = scale(xd[0], xd[1], pad.l, w - pad.r);
  const Ys = scale(yd[0], yd[1], h - pad.b, pad.t);
  const pxPerUnit = iw / (xd[1] - xd[0]);
  const mr = Math.max(7.5, Math.min(11, pxPerUnit * 0.42)); // exam marker radius: P6 and P7 are only ~1 unit apart
  const fs = mr >= 10 ? 13 : 11.5;
  const svgRef = useRef(null);
  const onClick = (e) => {
    const p = svgPoint(svgRef.current, e);
    let best = -1;
    let bd = exam ? 22 : 14;
    pts.forEach(([x, y], i) => {
      const d = Math.hypot(Xs(x) - p.x, Ys(y) - p.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best < 0) return;
    if (hideTruth) cycle(best);
    else setSel(best);
  };

  const explain = (i) => {
    const nb = r.nbrs[i];
    const cnt = r.count[i];
    const list = exam && nb.length ? ` (${self ? 'itself, ' : ''}${nb.map(name).join(', ')})` : exam && self ? ' (only itself)' : '';
    const what = self ? `${cnt} point${cnt === 1 ? '' : 's'} within ε, counting itself${list}` : `${cnt} neighbour${cnt === 1 ? '' : 's'} within ε${list}`;
    if (r.kind[i] === 'C') return `${name(i)}: ${what}; ${cnt} ≥ min_samples ${ms}, so it is a core point.`;
    const core = nb.filter((j) => r.kind[j] === 'C');
    if (r.kind[i] === 'B') return `${name(i)}: ${what}; ${cnt} < ${ms}, so not core, but core point ${name(core[0])} is within ε, so it is a border point.`;
    return `${name(i)}: ${what}; ${cnt} < ${ms} and no core point within ε, so it is an outlier (label −1).`;
  };

  const big = pts.length <= 30;
  const color = (i) => CL[r.label[i] % 6];
  const soft = (i) => CL_SOFT[r.label[i] % 6];
  const nCore = r.kind.filter((k) => k === 'C').length;
  const nBorder = r.kind.filter((k) => k === 'B').length;

  return (
    <WidgetFrame
      title={exam ? '2019 paper Q53: label the DBSCAN points' : 'DBSCAN: core, border and outlier points'}
      lead={
        exam
          ? 'Click each point (or its button) to cycle your guess C → B → O, then Check. The circles have radius ε = 1.9; try min_samples 2, then 3.'
          : 'Change ε and min_samples and watch points switch between core (C), border (B) and outlier (O). Click a point to see its count.'
      }
      actions={Object.entries(PRESETS).map(([k, v]) => (
        <Btn size="sm" key={k} kind={k === preset ? 'primary' : ''} onClick={() => load(k)}>
          {v.label}
        </Btn>
      ))}
      foot={
        <span>
          Core point: at least min_samples points in its ε-neighbourhood (scikit-learn counts the point itself). Border point: inside a core
          point's neighbourhood but not core itself. Everything else is noise (label −1). The number of clusters falls out automatically.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider
            label="ε (eps)"
            value={eps}
            min={P.er[0]}
            max={P.er[1]}
            step={P.er[2]}
            onInput={(v) => {
              setEps(v);
              resetCheck();
            }}
            format={(v) => fmt(v, 2)}
            hint={exam ? '1.9 = radius of the circles drawn in the paper' : undefined}
          />
          <Slider
            label="min_samples"
            value={ms}
            min={1}
            max={8}
            step={1}
            onInput={(v) => {
              setMs(v);
              resetCheck();
            }}
            format={String}
          />
          <div class="stack-sm">
            <Seg
              label="What counts towards min_samples"
              value={self}
              onChange={(v) => {
                setSelf(v);
                resetCheck();
              }}
              options={[
                { value: true, label: 'Incl. itself', title: 'scikit-learn default' },
                { value: false, label: 'Neighbours only' },
              ]}
            />
            <div class="ctl-hint">{self ? 'scikit-learn and Géron count the point itself (the default here).' : 'Some textbooks count only the other points.'}</div>
          </div>
          <div class="wg-row">
            <Check checked={circles} onChange={setCircles}>
              Show ε circles
            </Check>
            {exam && (
              <Check
                checked={quiz}
                onChange={(v) => {
                  setQuiz(v);
                  resetCheck();
                }}
              >
                Quiz mode
              </Check>
            )}
          </div>
          {!hideTruth && (
            <div class="readouts" aria-live="polite">
              <Readout label="Clusters" value={r.clusters} tone="blue" />
              <Readout label="Outliers (−1)" value={r.outliers} tone={r.outliers ? 'bad' : undefined} />
              <Readout label="Core" value={nCore} />
              <Readout label="Border" value={nBorder} />
            </div>
          )}
        </div>
        <div class="wg-plot" ref={ref}>
          <Plot
            w={w}
            h={h}
            x={xd}
            y={yd}
            pad={pad}
            svgRef={svgRef}
            onClick={onClick}
            class="dbscan-lab-plot"
            label={`DBSCAN with eps ${fmt(eps, 2)} and min_samples ${ms}`}
          >
            {({ X, Y }) => {
              const R = eps * pxPerUnit;
              return (
                <g>
                  {circles &&
                    pts.map(([x, y], i) =>
                      !hideTruth && r.kind[i] === 'C' && !big ? (
                        <circle key={'e' + i} cx={X(x)} cy={Y(y)} r={R} fill={soft(i)} fill-opacity="0.55" />
                      ) : (
                        <circle
                          key={'e' + i}
                          cx={X(x)}
                          cy={Y(y)}
                          r={R}
                          fill="none"
                          stroke={!hideTruth && r.label[i] >= 0 ? color(i) : 'var(--ink-3)'}
                          stroke-opacity={big ? 0.75 : 0.45}
                          stroke-width={big ? 1.4 : 1}
                          stroke-dasharray={!hideTruth && r.kind[i] === 'C' ? undefined : '4 3'}
                        />
                      )
                    )}
                  {sel != null && !hideTruth && sel < pts.length && (
                    <circle cx={X(pts[sel][0])} cy={Y(pts[sel][1])} r={R} fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 4" />
                  )}
                  {pts.map(([x, y], i) => {
                    const cx = X(x);
                    const cy = Y(y);
                    const [ldx, ldy, la] = exam ? EXAM_LBL[i] : [0, -1.5, 'middle'];
                    const nameTag = (
                      <text class="lbl" x={cx + ldx * mr} y={cy + ldy * mr} text-anchor={la}>
                        {name(i)}
                      </text>
                    );
                    if (hideTruth) {
                      const g = guess[i];
                      const ok = g === r.kind[i];
                      return (
                        <g key={i}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={mr}
                            fill="var(--paper)"
                            stroke={checked ? (ok ? 'var(--tick)' : 'var(--marker)') : 'var(--ink-2)'}
                            stroke-width={checked ? 2.6 : 1.6}
                            stroke-dasharray={checked && !ok ? '3 2' : undefined}
                          />
                          <text x={cx} y={cy + fs * 0.36} text-anchor="middle" style={{ fontSize: fs + 'px', fontWeight: 700 }} fill={g ? 'var(--ink)' : 'var(--ink-3)'}>
                            {g || '?'}
                          </text>
                          {nameTag}
                        </g>
                      );
                    }
                    const k = r.kind[i];
                    if (big) {
                      return (
                        <g key={i}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={mr}
                            fill={k === 'C' ? color(i) : k === 'B' ? soft(i) : 'var(--paper)'}
                            stroke={k === 'O' ? 'var(--ink-3)' : color(i)}
                            stroke-width="2"
                            stroke-dasharray={k === 'O' ? '3 2' : undefined}
                          />
                          <text x={cx} y={cy + fs * 0.36} text-anchor="middle" style={{ fontSize: fs + 'px', fontWeight: 700 }} fill={k === 'C' ? 'var(--paper)' : k === 'B' ? color(i) : 'var(--ink-2)'}>
                            {k}
                          </text>
                          {nameTag}
                        </g>
                      );
                    }
                    if (k === 'C') return <circle key={i} cx={cx} cy={cy} r="4.3" fill={color(i)} />;
                    if (k === 'B') return <circle key={i} cx={cx} cy={cy} r="3.6" fill="var(--paper)" stroke={color(i)} stroke-width="2" />;
                    return <path key={i} d={`M${cx - 3.6},${cy - 3.6}L${cx + 3.6},${cy + 3.6}M${cx + 3.6},${cy - 3.6}L${cx - 3.6},${cy + 3.6}`} stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />;
                  })}
                  {sel != null && !hideTruth && !big && sel < pts.length && (
                    <circle cx={X(pts[sel][0])} cy={Y(pts[sel][1])} r="7" fill="none" stroke="var(--ink)" stroke-width="1.6" />
                  )}
                </g>
              );
            }}
          </Plot>
          {!big && !hideTruth && (
            <div class="wg-legend" aria-label="Legend">
              <span>● core (filled)</span>
              <span>○ border (ring)</span>
              <span>✕ outlier, label −1</span>
              <span>colour = cluster</span>
            </div>
          )}
          {exam && (
            <div class="dbscan-lab-pts" role="group" aria-label={hideTruth ? 'Your guesses' : 'Select a point'}>
              {pts.map((_, i) => {
                const g = guess[i];
                const st = checked && g ? (g === r.kind[i] ? 'dbscan-lab-ok' : 'dbscan-lab-no') : '';
                return (
                  <Btn key={i} size="sm" class={st} onClick={() => (hideTruth ? cycle(i) : setSel(i))} aria-label={`${name(i)}: ${hideTruth ? 'guess ' + (g || 'none') : KIND[r.kind[i]]}`}>
                    {name(i)} {hideTruth ? g || '?' : r.kind[i]}
                    {st === 'dbscan-lab-ok' ? ' ✓' : st === 'dbscan-lab-no' ? ' ✗' : ''}
                  </Btn>
                );
              })}
            </div>
          )}
          {quiz && (
            <div class="wg-row">
              <Btn size="sm" kind="primary" class="dbscan-lab-check" disabled={guess.every((g) => !g)} onClick={() => setChecked(true)}>
                Check
              </Btn>
              <Btn size="sm" class="dbscan-lab-reveal" onClick={() => setRevealed((v) => !v)}>
                {revealed ? 'Hide answers' : 'Reveal'}
              </Btn>
              <Btn size="sm" kind="ghost" onClick={() => { setGuess(Array(pts.length).fill(null)); resetCheck(); }}>
                Clear guesses
              </Btn>
            </div>
          )}
          {quiz && checked && (
            <Fb kind={nRight === pts.length ? 'good' : 'hint'}>
              {nRight} of {pts.length} correct for min_samples = {ms}, {self ? 'counting the point itself' : 'neighbours only'}.
              {nRight === pts.length ? ' Now try the other min_samples value.' : ' Count the points inside each circle, then look for a core neighbour.'}
            </Fb>
          )}
          {!hideTruth && (
            <div class="dbscan-lab-explain" aria-live="polite">
              {sel != null && sel < pts.length ? explain(sel) : 'Click a point to see why it is core, border or outlier.'}
              {!exam && (
                <span>
                  {' '}
                  <Btn size="sm" kind="ghost" onClick={() => setSel((s) => (s == null ? 0 : (s + 1) % pts.length))}>
                    Next point
                  </Btn>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
