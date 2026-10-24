// k-means one step at a time: assign / update, inertia, bad local optima, k-means++, elbow & silhouette (W10b s5-18).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Readout, Fb } from '../ui.jsx';
import { fmt, scale, linePath, rng } from '../lib/svg.js';
import { makeBlobs, initRandom, initPlusPlus, assign, update, inertia, nearest, chooseKCurves } from './kmeans-stepper-math.js';
import { useWidth, equalDomain, CL, CL_SOFT, shapePath } from './c-helpers.jsx';

const css = `
.kmeans-stepper-hist { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; color: var(--ink-2); overflow-wrap: anywhere; line-height: 1.5; }
.kmeans-stepper-log td.kmeans-stepper-best { color: var(--tick); font-weight: 700; }
.kmeans-stepper-log td, .kmeans-stepper-log th { padding: 2px 6px; }
.kmeans-stepper-two { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.kmeans-stepper-cap { font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 4px; }
.kmeans-stepper-sec { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--ink-2); }
.kmeans-stepper-hr { border: 0; border-top: 1px dashed var(--rule-2); margin: 2px 0; width: 100%; }
`;

const SEED = { random: 300, pp: 200 };

function fresh(pts, k, init, n) {
  const r = rng(SEED[init] + n);
  const centres = init === 'random' ? initRandom(pts, k, r) : initPlusPlus(pts, k, r);
  return { centres, prev: null, labels: null, phase: 'init', iter: 0, hist: [], changed: null, logged: false };
}

function doAssign(pts, s) {
  const labels = assign(pts, s.centres);
  const changed = s.labels ? labels.reduce((c, l, i) => c + (l !== s.labels[i] ? 1 : 0), 0) : labels.length;
  const done = s.labels != null && changed === 0;
  return { ...s, labels, prev: null, phase: done ? 'done' : 'assigned', hist: [...s.hist, inertia(pts, labels, s.centres)], changed };
}

function doUpdate(pts, s) {
  const centres = update(pts, s.labels, s.centres);
  const moved = centres.some((c, j) => Math.hypot(c[0] - s.centres[j][0], c[1] - s.centres[j][1]) > 1e-9);
  return { ...s, centres, prev: s.centres, phase: moved ? 'updated' : 'done', iter: s.iter + 1, hist: [...s.hist, inertia(pts, s.labels, centres)] };
}

const NEXT = { init: 'Assign', assigned: 'Update centres', updated: 'Assign', done: '' };

export default function KmeansStepper() {
  const pts = useMemo(() => makeBlobs(3), []);
  const curves = useMemo(() => chooseKCurves(pts), [pts]);
  const [k, setK] = useState(4);
  const [init, setInit] = useState('random');
  const [runNo, setRunNo] = useState(1);
  const [st, setSt] = useState(() => fresh(pts, 4, 'random', 1));
  const [log, setLog] = useState([]);

  const commit = (next) => {
    if (next.phase === 'done' && !next.logged) {
      next = { ...next, logged: true };
      const entry = { n: runNo, init, k, inertia: next.hist[next.hist.length - 1], iters: next.iter };
      setLog((L) => [...L, entry]);
    }
    setSt(next);
  };
  const restart = (kk = k, ii = init) => {
    const n = runNo + 1;
    setRunNo(n);
    setSt(fresh(pts, kk, ii, n));
  };
  const runAll = () => {
    let s = st;
    for (let i = 0; i < 400 && s.phase !== 'done'; i++) s = s.phase === 'assigned' ? doUpdate(pts, s) : doAssign(pts, s);
    commit(s);
  };

  // plot geometry (equal aspect so the Voronoi borders are true perpendicular bisectors)
  const [ref, w] = useWidth(400);
  const h = Math.round(Math.max(240, Math.min(360, w * 0.6)));
  const pad = { l: 34, r: 10, t: 10, b: 28 };
  const [xd, yd] = equalDomain([-3.35, 1.45], [0.85, 3.2], w - pad.l - pad.r, h - pad.t - pad.b);

  // nearest-centre regions on a coarse grid, merged into one path per cluster
  const regions = useMemo(() => {
    const X = scale(xd[0], xd[1], pad.l, w - pad.r);
    const Y = scale(yd[0], yd[1], h - pad.b, pad.t);
    const cell = 6;
    const x0 = pad.l;
    const x1 = w - pad.r;
    const paths = st.centres.map(() => '');
    for (let py = pad.t; py < h - pad.b; py += cell) {
      const ch = Math.min(cell, h - pad.b - py);
      let runStart = x0;
      let runJ = -1;
      for (let px = x0; ; px += cell) {
        const atEnd = px >= x1;
        const j = atEnd ? -2 : nearest([X.invert(Math.min(px + cell / 2, x1)), Y.invert(py + ch / 2)], st.centres);
        if (j !== runJ) {
          if (runJ >= 0) {
            const xe = Math.min(px, x1);
            paths[runJ] += `M${runStart},${py}h${xe - runStart}v${ch}h${runStart - xe}Z`;
          }
          runStart = px;
          runJ = j;
        }
        if (atEnd) break;
      }
    }
    return paths;
  }, [st.centres, w, h, xd[0], yd[0]]);

  const cur = st.hist.length ? st.hist[st.hist.length - 1] : null;
  const sameK = log.filter((e) => e.k === k);
  const bestI = sameK.length ? Math.min(...sameK.map((e) => e.inertia)) : null;
  const shown = log.slice(-6).reverse();
  const best4 = curves.find((c) => c.k === 4);
  const maxI = curves[0].inertia;
  const yTop = Math.ceil((curves[1].inertia * 1.2) / 25) * 25; // k = 1 runs off the top, as on the slide
  const clipId = 'kmeans-stepper-clip-' + useId();
  const silBest = curves.filter((c) => c.sil != null).reduce((a, c) => (c.sil > a.sil ? c : a));

  const [ref2, w2] = useWidth(320);
  const [ref3, w3] = useWidth(320);

  return (
    <WidgetFrame
      title="k-means, one step at a time"
      lead="Press Assign and Update centres in turn (or Run to convergence), then New initialisation: different starts can end in different clusterings."
      foot={
        <span>
          k-means always converges, but maybe to a local optimum, so run several initialisations (<code>n_init</code>) or use k-means++ and keep
          the lowest inertia. Inertia always drops as k grows, so choose k at the elbow or where the silhouette score is highest.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="Number of clusters k" value={k} min={1} max={8} step={1} onInput={(v) => { setK(v); restart(v, init); }} format={(v) => String(v)} />
          <Seg
            label="Initialisation"
            value={init}
            onChange={(v) => {
              setInit(v);
              restart(k, v);
            }}
            options={[
              { value: 'random', label: 'Random', title: "init='random'" },
              { value: 'pp', label: 'k-means++', title: "init='k-means++' (scikit-learn default)" },
            ]}
          />
          <div class="wg-row">
            <Btn size="sm" kind={st.phase === 'init' || st.phase === 'updated' ? 'primary' : ''} class="kmeans-stepper-assign" disabled={!(st.phase === 'init' || st.phase === 'updated')} onClick={() => commit(doAssign(pts, st))}>
              Assign
            </Btn>
            <Btn size="sm" kind={st.phase === 'assigned' ? 'primary' : ''} class="kmeans-stepper-update" disabled={st.phase !== 'assigned'} onClick={() => commit(doUpdate(pts, st))}>
              Update centres
            </Btn>
            <Btn size="sm" class="kmeans-stepper-run" disabled={st.phase === 'done'} onClick={runAll}>
              Run to convergence
            </Btn>
            <Btn size="sm" class="kmeans-stepper-new" onClick={() => restart()}>
              New initialisation
            </Btn>
          </div>
          <div class="readouts" aria-live="polite">
            <Readout
              label="Inertia"
              value={cur == null ? '–' : fmt(cur, 1)}
              sub={cur == null ? 'press Assign' : 'sum of squared distances'}
              tone={st.phase === 'done' ? 'good' : undefined}
            />
            <Readout
              label={`Run ${runNo}`}
              value={st.phase === 'done' ? 'converged' : `iter ${st.iter}`}
              sub={st.phase === 'done' ? `after ${st.iter} updates` : `next: ${NEXT[st.phase]}`}
              tone={st.phase === 'done' ? 'good' : undefined}
            />
          </div>
          {st.hist.length > 1 && (
            <div class="kmeans-stepper-hist" aria-label="Inertia after each step">
              {st.hist.slice(-7).map((v) => fmt(v, 1)).join(' → ')}
              <div class="faint small" style={{ fontFamily: 'var(--font-ui)' }}>
                Inertia never goes up: each step can only shorten the distances.
              </div>
            </div>
          )}
          {st.phase === 'assigned' && st.changed != null && st.iter > 0 && (
            <div class="faint small">{st.changed} point{st.changed === 1 ? '' : 's'} switched cluster.</div>
          )}
        </div>
        <div class="wg-plot" ref={ref}>
          <Plot w={w} h={h} x={xd} y={yd} pad={pad} xLabel="x₁" yLabel="x₂" label={`k-means with k = ${k}, ${st.phase === 'done' ? 'converged' : 'iteration ' + st.iter}`}>
            {({ X, Y }) => (
              <g>
                {regions.map((d, j) => d && <path key={'v' + j} d={d} fill={CL_SOFT[j]} fill-opacity="0.85" />)}
                {pts.map(([x, y], i) =>
                  st.labels ? (
                    <path key={i} d={shapePath(st.labels[i], X(x), Y(y), 3.4)} fill={CL[st.labels[i]]} stroke="var(--paper)" stroke-width="0.7" />
                  ) : (
                    <circle key={i} cx={X(x)} cy={Y(y)} r="3" fill="var(--paper)" stroke="var(--ink-3)" stroke-width="1.2" />
                  )
                )}
                {st.prev &&
                  st.prev.map((c, j) => (
                    <line key={'m' + j} x1={X(c[0])} y1={Y(c[1])} x2={X(st.centres[j][0])} y2={Y(st.centres[j][1])} stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 3" />
                  ))}
                {st.centres.map((c, j) => {
                  const cx = X(c[0]);
                  const cy = Y(c[1]);
                  return (
                    <g key={'c' + j}>
                      <circle cx={cx} cy={cy} r="8.5" fill="var(--paper)" stroke={CL[j]} stroke-width="2.5" />
                      <path d={`M${cx - 4},${cy - 4}L${cx + 4},${cy + 4}M${cx + 4},${cy - 4}L${cx - 4},${cy + 4}`} stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" />
                    </g>
                  );
                })}
              </g>
            )}
          </Plot>
          <div class="wg-legend">
            <span>✕ = centre</span>
            <span>shaded = nearest-centre region (what Assign will do)</span>
            <span>dashed = how far Update moved each centre</span>
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <div class="stack-sm">
          <div class="mini-wrap">
            <table class="mini kmeans-stepper-log">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>init</th>
                  <th>k</th>
                  <th>final inertia</th>
                  <th class="l">keep?</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const best = e.k === k && Math.abs(e.inertia - bestI) < 1e-9;
                  return (
                    <tr key={e.n} class={best ? 'hl' : ''}>
                      <td>{e.n}</td>
                      <td>{e.init === 'pp' ? 'k-means++' : 'random'}</td>
                      <td>{e.k}</td>
                      <td>{fmt(e.inertia, 1)}</td>
                      <td class={'l' + (best ? ' kmeans-stepper-best' : '')}>{best ? '✓ lowest for this k' : e.k === k ? 'worse: local optimum' : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sameK.length > 1 && new Set(sameK.map((e) => e.inertia.toFixed(3))).size > 1 && (
            <Fb kind="info">Same data, same k, different starts, different answers. <code>n_init</code> does exactly this and keeps the run with the lowest inertia.</Fb>
          )}
        </div>
      )}

      <hr class="kmeans-stepper-hr" />
      <div class="kmeans-stepper-sec">How many clusters? (best of 10 k-means++ runs per k)</div>
      <div class="kmeans-stepper-two">
        <div ref={ref2} style={{ minWidth: 0 }}>
          <div class="kmeans-stepper-cap">Inertia keeps dropping: look for the elbow</div>
          <Plot w={w2} h={190} x={[0.5, 8.5]} y={[0, yTop]} pad={{ l: 44, r: 12, t: 12, b: 36 }} xTicks={[1, 2, 3, 4, 5, 6, 7, 8]} yTicks={[0, 50, 100, 150].filter((v) => v <= yTop)} xFmt={String} yFmt={(v) => fmt(v, 0)} xLabel="k" label="Inertia against k">
            {({ X, Y, w: ww, h: hh, pad: pp }) => (
              <g>
                <defs>
                  <clipPath id={clipId}>
                    <rect x={pp.l} y={pp.t} width={ww - pp.l - pp.r} height={hh - pp.t - pp.b} />
                  </clipPath>
                </defs>
                <g clip-path={`url(#${clipId})`}>
                  <path d={linePath(curves.map((c) => [c.k, c.inertia]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="2" />
                  {curves.map((c) => (
                    <circle key={c.k} cx={X(c.k)} cy={Y(c.inertia)} r={c.k === k ? 5.5 : 3.5} fill={c.k === k ? 'var(--marker)' : 'var(--biro)'} />
                  ))}
                </g>
                <text class="lbl" x={X(2) + 10} y={pp.t + 12}>
                  ↖ k = 1 is off the scale ({fmt(maxI, 0)})
                </text>
                <text class="lbl-strong" x={X(4) + 6} y={Y(best4.inertia) - 12}>
                  ↙ elbow (k = 4)
                </text>
              </g>
            )}
          </Plot>
        </div>
        <div ref={ref3} style={{ minWidth: 0 }}>
          <div class="kmeans-stepper-cap">Silhouette score (b − a) / max(a, b): highest is best</div>
          <Plot w={w3} h={190} x={[1.5, 8.5]} y={[0.4, 0.8]} pad={{ l: 44, r: 12, t: 12, b: 36 }} xTicks={[2, 3, 4, 5, 6, 7, 8]} yTicks={[0.4, 0.5, 0.6, 0.7, 0.8]} xFmt={String} yFmt={(v) => fmt(v, 1)} xLabel="k" label="Silhouette score against k">
            {({ X, Y }) => {
              const sc = curves.filter((c) => c.sil != null);
              return (
                <g>
                  <path d={linePath(sc.map((c) => [c.k, c.sil]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="2" />
                  {sc.map((c) => (
                    <circle key={c.k} cx={X(c.k)} cy={Y(c.sil)} r={c.k === k ? 5.5 : 3.5} fill={c.k === k ? 'var(--marker)' : 'var(--biro)'} />
                  ))}
                  <text class="lbl-strong" x={X(silBest.k)} y={Y(silBest.sil) - 10} text-anchor="middle">
                    best k = {silBest.k} ({fmt(silBest.sil, 2)})
                  </text>
                </g>
              );
            }}
          </Plot>
        </div>
      </div>
    </WidgetFrame>
  );
}
