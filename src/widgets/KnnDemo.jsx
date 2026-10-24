// k-nearest neighbours on the W2 s6 toy example: distances, the k-circle, the vote, and why features need scaling.
import { useState, useMemo, useRef, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Fb, Readout } from '../ui.jsx';
import { scale, svgPoint, clamp, fmt } from '../lib/svg.js';
import { POINTS, QUERY, knn, voteAt, distLabel } from './knn-demo-math.js';
import { useWidth, marker } from './d-shared.js';

const XD = [-3, 3];
const YD = [-1, 4];
const PAD = { l: 34, r: 10, t: 10, b: 36 };
const STEP = 0.2; // decision-region cell size

const css = `
.knn-demo-wrap { max-width: 460px; }
.knn-demo-q { cursor: grab; outline: none; }
.knn-demo-q:focus-visible .knn-demo-qring { stroke: var(--biro); stroke-width: 2.5; }
.knn-demo-tab td, .knn-demo-tab th { white-space: nowrap; }
.knn-demo-cls { display: inline-flex; align-items: center; gap: 5px; }
.knn-demo-cls svg { flex: none; }
.knn-demo-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
`;

const shapeOf = (c) => (c === 'Red' ? 'circle' : 'square');
const colOf = (c) => (c === 'Red' ? 'var(--cB)' : 'var(--cA)');

function ClassTag({ c }) {
  return (
    <span class="knn-demo-cls">
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path d={marker(shapeOf(c), 6, 6, 4.6)} fill={colOf(c)} />
      </svg>
      {c}
    </span>
  );
}

export default function KnnDemo() {
  const [k, setK] = useState(3);
  const [q, setQ] = useState(QUERY);
  const [unscaled, setUnscaled] = useState(false);
  const [regions, setRegions] = useState(true);
  const [wrapRef, width] = useWidth(360);
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const clipId = 'knn-demo-clip-' + useId();
  const s1 = unscaled ? 100 : 1;

  const res = useMemo(() => knn(q, k, s1), [q, k, s1]);
  const alt = useMemo(() => knn(q, k, unscaled ? 1 : 100), [q, k, unscaled]);

  // decision regions: vote at the centre of every STEP×STEP cell (≈ 750 cells)
  const cells = useMemo(() => {
    if (!regions) return [];
    const out = [];
    for (let a = XD[0]; a < XD[1] - 1e-9; a += STEP)
      for (let b = YD[0]; b < YD[1] - 1e-9; b += STEP) out.push([a, b, voteAt(a + STEP / 2, b + STEP / 2, k, s1)]);
    return out;
  }, [k, s1, regions]);

  const W = Math.max(280, Math.min(width, 460));
  const ppu = (W - PAD.l - PAD.r) / (XD[1] - XD[0]);
  const H = Math.round(PAD.t + PAD.b + ppu * (YD[1] - YD[0]));
  const X = scale(XD[0], XD[1], PAD.l, W - PAD.r);
  const Y = scale(YD[0], YD[1], H - PAD.b, PAD.t);

  const moveTo = (evt) => {
    const p = svgPoint(svgRef.current, evt);
    const snap = (v) => Math.round(v * 10) / 10;
    setQ({ x1: clamp(snap(X.invert(p.x)), XD[0], XD[1]), x2: clamp(snap(Y.invert(p.y)), YD[0], YD[1]) });
  };
  const onDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e);
  };
  const onMove = (e) => dragging.current && moveTo(e);
  const onUp = () => (dragging.current = false);
  const onKey = (e) => {
    const d = e.shiftKey ? 0.5 : 0.1;
    const m = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (!m) return;
    e.preventDefault();
    setQ((o) => ({ x1: clamp(Math.round((o.x1 + m[0]) * 10) / 10, XD[0], XD[1]), x2: clamp(Math.round((o.x2 + m[1]) * 10) / 10, YD[0], YD[1]) }));
  };

  const nearSet = new Set(res.near.map((r) => r.i));
  const qx = X(q.x1);
  const qy = Y(q.x2);
  const isDefault = q.x1 === QUERY.x1 && q.x2 === QUERY.x2;
  const fmtD = (r) => (unscaled ? r.d.toFixed(2) : distLabel(r.sq));
  const voteText = res.vote === 'tie' ? 'Tie' : res.vote;
  const qLabel = `(${fmt(q.x1, 1)}, ${fmt(q.x2, 1)})`;

  return (
    <WidgetFrame
      title="k-nearest neighbours"
      lead="Change k and watch the vote among the k closest points; drag the black query point (or focus it and use the arrow keys)."
      actions={
        <>
          <Btn size="sm" onClick={() => { setQ(QUERY); setK(3); setUnscaled(false); }}>
            Slide example (W2 s6)
          </Btn>
          <Btn size="sm" onClick={() => { setQ({ x1: -0.5, x2: 2 }); setK(3); }}>
            Query where scaling matters
          </Btn>
        </>
      }
      foot={
        <span>
          kNN predicts the majority vote (classification) or the average (regression) of the k nearest training points; k = 1
          overfits, a larger k smooths the boundary. Scale features first ((x − min)/(max − min) or (x − mean)/sd), or the feature
          with the biggest range decides every distance.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="k (neighbours)" value={k} min={1} max={6} step={1} onInput={setK} format={(v) => String(v)} />
          <Seg
            label="Feature scaling"
            value={unscaled}
            onChange={setUnscaled}
            options={[
              { value: false, label: 'Same scale' },
              { value: true, label: 'Unscaled x₁ (×100)' },
            ]}
          />
          <div class="readouts">
            <Readout
              label={`Prediction, k = ${k}`}
              value={voteText}
              tone={res.vote === 'tie' ? undefined : 'blue'}
              sub={res.red > res.blue ? `${res.red} Red vs ${res.blue} Blue` : `${res.blue} Blue vs ${res.red} Red`}
            />
          </div>
          {res.vote === 'tie' ? (
            <Fb kind="hint">No majority with an even k. Libraries break ties arbitrarily (e.g. by class order), so use an odd k for two classes.</Fb>
          ) : isDefault && !unscaled && (k === 1 || k === 3) ? (
            <Fb kind="info">
              {k === 1 ? 'k = 1: only i6 (Red, distance 1) votes → Red.' : 'k = 3: i6 Red, i2 Blue, i4 Blue → Blue wins 2 to 1.'} The slide gives the same answers.
            </Fb>
          ) : null}
          {unscaled && (
            <Fb kind="hint">
              x₁ is now in units 100× bigger, so its differences swamp x₂: points with the same x₁ end up almost equally far away
              whatever their x₂, and the neighbourhood becomes a vertical band. Normalise first: (x − min)/(max − min) or
              (x − mean)/sd.
            </Fb>
          )}
          {alt.vote !== res.vote && alt.vote !== 'tie' && res.vote !== 'tie' && (
            <Fb kind="info" mark="≠">
              {unscaled
                ? `Scaling changed the answer: with both features on the same scale this query is ${alt.vote}.`
                : `Switch on “Unscaled x₁ (×100)”: the same query would be called ${alt.vote}.`}
            </Fb>
          )}
          <label class="row small muted">
            <input type="checkbox" checked={regions} onChange={(e) => setRegions(e.currentTarget.checked)} /> Shade the predicted class
            everywhere
          </label>
        </div>
        <div class="wg-plot">
          <div class="knn-demo-wrap" ref={wrapRef}>
            <Plot
              w={W}
              h={H}
              x={XD}
              y={YD}
              pad={PAD}
              xTicks={[-3, -2, -1, 0, 1, 2, 3]}
              yTicks={[-1, 0, 1, 2, 3, 4]}
              xFmt={(v) => fmt(v * s1)}
              xLabel={unscaled ? 'x₁ (×100, unscaled)' : 'x₁'}
              yLabel="x₂"
              svgRef={svgRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              label={`Scatter of six training points and the query ${qLabel}; the ${k} nearest are joined to it.`}
            >
              {() => (
                <g>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
                    </clipPath>
                  </defs>
                  <g clip-path={`url(#${clipId})`}>
                    {['Red', 'Blue', 'tie'].map((v) => {
                      const sz = (ppu * STEP + 0.6).toFixed(2);
                      const d = cells
                        .filter((c) => c[2] === v)
                        .map(([a, b]) => `M${X(a).toFixed(2)},${Y(b + STEP).toFixed(2)}h${sz}v${sz}h-${sz}Z`)
                        .join('');
                      return d ? <path key={v} d={d} fill={v === 'Red' ? 'var(--c2-soft)' : v === 'Blue' ? 'var(--c1-soft)' : 'var(--paper-3)'} /> : null;
                    })}
                    {unscaled ? (
                      <ellipse cx={qx} cy={qy} rx={(res.radius / s1) * ppu} ry={res.radius * ppu} fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="5 4" />
                    ) : (
                      <circle cx={qx} cy={qy} r={res.radius * ppu} fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="5 4" />
                    )}
                  </g>
                  {res.near.map((r) => (
                    <line key={'l' + r.i} x1={qx} y1={qy} x2={X(r.x1)} y2={Y(r.x2)} stroke="var(--ink)" stroke-width="1.6" />
                  ))}
                  {POINTS.map((p) => (
                    <g key={p.i}>
                      {nearSet.has(p.i) && <circle cx={X(p.x1)} cy={Y(p.x2)} r="10.5" fill="none" stroke="var(--hint)" stroke-width="2" />}
                      <path d={marker(shapeOf(p.c), X(p.x1), Y(p.x2), 6.5)} fill={colOf(p.c)} stroke="var(--paper)" stroke-width="1.2" />
                      <text class="lbl knn-demo-halo" x={X(p.x1) + 11} y={Y(p.x2) - 10}>
                        {'i' + p.i}
                      </text>
                    </g>
                  ))}
                  <g
                    class="knn-demo-q"
                    tabindex="0"
                    role="slider"
                    aria-label={`Query point ${qLabel}. Arrow keys move it by 0.1, Shift by 0.5.`}
                    aria-valuetext={qLabel}
                    onKeyDown={onKey}
                  >
                    <circle class="knn-demo-qring" cx={qx} cy={qy} r="12" fill="transparent" stroke="var(--ink)" stroke-width="1" />
                    <path d={marker('diamond', qx, qy, 6.5)} fill="var(--ink)" stroke="var(--paper)" stroke-width="1.2" />
                  </g>
                  <text class="lbl-strong knn-demo-halo" x={qx + (q.x1 > 1.6 ? -14 : 14)} y={qy + 18} text-anchor={q.x1 > 1.6 ? 'end' : 'start'}>
                    query {unscaled ? `(${fmt(q.x1 * 100, 0)}, ${fmt(q.x2, 1)})` : qLabel}
                  </text>
                </g>
              )}
            </Plot>
          </div>
          <div class="wg-legend">
            <span>
              <ClassTag c="Red" />
            </span>
            <span>
              <ClassTag c="Blue" />
            </span>
            <span>◆ query · ring = one of the k nearest · dashed = distance to the k-th</span>
          </div>
          <div class="mini-wrap">
            <table class="mini knn-demo-tab" aria-label="Training points sorted by distance to the query">
              <thead>
                <tr>
                  <th>rank</th>
                  <th>i</th>
                  <th>(x₁, x₂)</th>
                  <th>y</th>
                  <th>‖xᵢ − x*‖₂</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.i} class={r.rank <= k ? 'hl' : ''}>
                    <td>{r.rank}</td>
                    <td>{r.i}</td>
                    <td>({fmt(r.x1 * s1)}, {fmt(r.x2)})</td>
                    <td class="l">
                      <ClassTag c={r.c} />
                    </td>
                    <td>{fmtD(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
