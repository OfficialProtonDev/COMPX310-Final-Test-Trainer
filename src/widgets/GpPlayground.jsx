// Gaussian process regression on the fish example (W9a s3–6, s12–15): prior samples, posterior, kernel length scale.
import { useState, useMemo, useRef, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Num, Btn, Fb, Readout } from '../ui.jsx';
import { fmt, fix, clamp, scale, linspace, linePath, bandPath, svgPoint } from '../lib/svg.js';
import { gpPosterior, gpSamples, normals } from './gp-math.js';
import { useWidth } from './b-hooks.js';

const FISH = [
  { x: 10, y: 12 },
  { x: 15, y: 22 },
  { x: 20, y: 16 },
];
const XR = [5, 30];
const YR = [0, 35];
const N = 101; // grid 5 … 30 in steps of 0.25 °C
const XS = linspace(XR[0], XR[1], N);
const PAD = { l: 40, r: 14, t: 16, b: 38 };
const PAD_K = { l: 36, r: 10, t: 10, b: 32 };
const MAX_OBS = 15;
const SAMPLE_COLS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];

const css = `
.gp-playground { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
.gp-playground-split { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "plot" "ctl" "below"; align-items: start; }
.gp-playground-split > .gp-playground-plot { grid-area: plot; }
.gp-playground-split > .wg-controls { grid-area: ctl; }
.gp-playground-split > .gp-playground-below { grid-area: below; }
@container (min-width: 700px) {
  .gp-playground-split { grid-template-columns: minmax(0, 1fr) minmax(250px, 290px); grid-template-rows: auto 1fr; grid-template-areas: "plot ctl" "below ctl"; }
}
.gp-playground-plot svg.plot { cursor: crosshair; }
.gp-playground-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
.gp-playground-q { cursor: ew-resize; }
.gp-playground-add { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; }
.gp-playground-add .ctl-label { margin-right: 2px; }
.gp-playground-lg { display: inline-flex; align-items: center; gap: 5px; }
.gp-playground-below { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@container (min-width: 700px) { .gp-playground-below { grid-template-columns: minmax(0, 340px) minmax(0, 1fr); } }
.gp-playground-code { overflow-wrap: anywhere; }
`;

export default function GpPlayground() {
  const [obs, setObs] = useState(FISH);
  const [mode, setMode] = useState('post');
  const [l, setL] = useState(5);
  const [sf, setSf] = useState(5);
  const [sn, setSn] = useState(1);
  const [m0, setM0] = useState(16);
  const [qx, setQx] = useState(17);
  const [seed, setSeed] = useState(4);
  const [nx, setNx] = useState(17);
  const [ny, setNy] = useState(20);
  const [ref, W] = useWidth(560);
  const [refK, WK] = useWidth(260);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const clipId = 'gp-playground-clip-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const post = mode === 'post';
  const zs = useMemo(() => normals(5, N, seed), [seed]);
  const gp = useMemo(
    () => gpPosterior({ X: post ? obs.map((o) => o.x) : [], y: post ? obs.map((o) => o.y) : [], xs: XS, l, sf, sn, mean0: m0 }),
    [obs, post, l, sf, sn, m0],
  );
  const samples = useMemo(() => gpSamples(gp.mean, gp.cov, zs, sf * sf), [gp, zs]);
  // exact prediction at the query point (not just the nearest grid value)
  const q = useMemo(() => {
    const r = gpPosterior({ X: post ? obs.map((o) => o.x) : [], y: post ? obs.map((o) => o.y) : [], xs: [qx], l, sf, sn, mean0: m0 });
    return { mean: r.mean[0], std: r.std[0] };
  }, [obs, post, l, sf, sn, m0, qx]);

  const h = Math.round(clamp((W - PAD.l - PAD.r) * 0.6, 200, 360) + PAD.t + PAD.b);
  const X = scale(XR[0], XR[1], PAD.l, W - PAD.r);
  const Y = scale(YR[0], YR[1], h - PAD.b, PAD.t);
  const hK = Math.round(clamp((WK - PAD_K.l - PAD_K.r) * 0.45, 90, 130) + PAD_K.t + PAD_K.b);
  const dK = linspace(0, 25, 101);

  const addObs = (x, y) => {
    if (obs.length >= MAX_OBS) return;
    setObs((o) => [...o, { x: +clamp(x, XR[0], XR[1]).toFixed(1), y: +clamp(y, YR[0], YR[1]).toFixed(1) }]);
    setMode('post');
  };
  const onDown = (e) => {
    if (e.button) return;
    const p = svgPoint(svgRef.current, e);
    const nearQ = Math.abs(p.x - X(qx)) <= 12;
    drag.current = { q: nearQ, x0: p.x, y0: p.y, moved: false };
    if (svgRef.current && svgRef.current.setPointerCapture) svgRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const p = svgPoint(svgRef.current, e);
    if (Math.hypot(p.x - d.x0, p.y - d.y0) > 4) d.moved = true;
    if (d.q) setQx(Math.round(clamp(X.invert(p.x), XR[0], XR[1]) * 4) / 4);
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (svgRef.current && svgRef.current.hasPointerCapture && svgRef.current.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (!d.q && !d.moved) {
      const p = svgPoint(svgRef.current, e);
      addObs(X.invert(p.x), Y.invert(p.y));
    }
  };

  const lo = Array.from(gp.mean, (m, i) => clamp(m - 2 * gp.std[i], YR[0] - 60, YR[1] + 60));
  const hi = Array.from(gp.mean, (m, i) => clamp(m + 2 * gp.std[i], YR[0] - 60, YR[1] + 60));
  const priorStd = Math.sqrt(sf * sf + sn * sn);
  const gamma = 1 / (2 * l * l);

  return (
    <WidgetFrame
      title="Gaussian process regression"
      lead="Fish counts at three water temperatures. Click the plot to add a reading, drag the dashed marker, and change the kernel to see how the curves and the band respond."
      actions={
        <Seg
          label="Show"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'prior', label: 'Prior samples' },
            { value: 'post', label: 'Posterior' },
          ]}
        />
      }
      foot={
        <span>
          A GP is a distribution over functions; the kernel encodes the assumptions (smoothness via the length scale l, noise via
          WhiteKernel). Uncertainty shrinks near data and grows away from it. In sklearn:{' '}
          <code class="gp-playground-code">GaussianProcessRegressor(kernel=RBF() + WhiteKernel())</code>, then{' '}
          <code class="gp-playground-code">predict(X, return_std=True)</code>; mean ± 2 std ≈ 95%.
        </span>
      }
    >
      <style>{css}</style>
      <div class="gp-playground">
        <div class="gp-playground-split">
          <div class="wg-plot gp-playground-plot" ref={ref} onPointerCancel={onUp}>
            <Plot
              svgRef={svgRef}
              w={W}
              h={h}
              x={XR}
              y={YR}
              pad={PAD}
              xTicks={[5, 10, 15, 20, 25, 30]}
              yTicks={[0, 5, 10, 15, 20, 25, 30, 35]}
              xLabel="water temperature (°C)"
              yLabel="fish count"
              label={`${post ? 'Posterior' : 'Prior'} Gaussian process: five sample functions, mean and plus or minus two standard deviation band`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            >
              {({ w, h: hh, pad }) => (
                <g>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={hh - pad.t - pad.b} />
                    </clipPath>
                  </defs>
                  <g clip-path={`url(#${clipId})`}>
                    <path d={bandPath(XS, lo, hi, X, Y)} fill="var(--biro-soft)" fill-opacity="0.8" />
                    <path d={linePath(XS.map((x, i) => [x, hi[i]]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="1.2" stroke-dasharray="5 4" />
                    <path d={linePath(XS.map((x, i) => [x, lo[i]]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="1.2" stroke-dasharray="5 4" />
                    {samples.map((f, k) => (
                      <path key={k} d={linePath(XS.map((x, i) => [x, f[i]]), X, Y)} fill="none" stroke={SAMPLE_COLS[k]} stroke-width="1.4" opacity="0.75" />
                    ))}
                    <path d={linePath(XS.map((x, i) => [x, gp.mean[i]]), X, Y)} fill="none" stroke="var(--ink)" stroke-width="2.6" />
                  </g>
                  {/* query marker */}
                  <g class="gp-playground-q">
                    <line x1={X(qx)} x2={X(qx)} y1={pad.t} y2={hh - pad.b} stroke="var(--ink-2)" stroke-width="1.4" stroke-dasharray="5 4" />
                    <line x1={X(qx)} x2={X(qx)} y1={pad.t} y2={hh - pad.b} stroke="transparent" stroke-width="20" />
                    <line x1={X(qx)} x2={X(qx)} y1={Y(clamp(q.mean - 2 * q.std, YR[0], YR[1]))} y2={Y(clamp(q.mean + 2 * q.std, YR[0], YR[1]))} stroke="var(--ink)" stroke-width="3.2" />
                    {q.mean > YR[0] && q.mean < YR[1] && <circle cx={X(qx)} cy={Y(q.mean)} r="5" fill="var(--ink)" stroke="var(--plot-bg)" stroke-width="1.5" />}
                    <rect x={X(qx) - 7} y={pad.t - 2} width="14" height="12" rx="3" fill="var(--ink-2)" />
                    <text class="gp-playground-halo" x={X(qx) + (qx > 24 ? -8 : 8)} y={pad.t + 22} text-anchor={qx > 24 ? 'end' : 'start'} font-size="11.5" font-weight="700" fill="var(--ink)">
                      {fmt(qx, 2)} °C
                    </text>
                  </g>
                  {obs.map((o, i) => (
                    <circle
                      key={i}
                      cx={X(o.x)}
                      cy={Y(o.y)}
                      r="6"
                      fill={post ? 'var(--marker)' : 'var(--plot-bg)'}
                      stroke="var(--marker)"
                      stroke-width="2"
                      stroke-dasharray={post ? null : '3 2'}
                    />
                  ))}
                </g>
              )}
            </Plot>
            <div class="wg-legend" aria-hidden="true">
              <span class="gp-playground-lg">
                <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill={post ? 'var(--marker)' : 'none'} stroke="var(--marker)" stroke-width="1.6" /></svg>
                {post ? 'observed count' : 'observations (not used by the prior)'}
              </span>
              <span class="gp-playground-lg">
                <svg width="20" height="12" viewBox="0 0 20 12"><line x1="1" x2="19" y1="6" y2="6" stroke="var(--ink)" stroke-width="2.6" /></svg>
                {post ? 'posterior mean' : 'prior mean'}
              </span>
              <span class="gp-playground-lg">
                <svg width="20" height="12" viewBox="0 0 20 12"><path d="M1,8 C6,1 12,11 19,4" fill="none" stroke="var(--c3)" stroke-width="1.5" /></svg>
                5 sampled functions
              </span>
              <span class="gp-playground-lg">
                <svg width="20" height="12" viewBox="0 0 20 12"><rect x="1" y="1" width="18" height="10" fill="var(--biro-soft)" stroke="var(--biro)" stroke-dasharray="3 2" /></svg>
                mean ± 2 std (≈ 95%)
              </span>
            </div>
          </div>

          <div class="wg-controls">
            <div class="readouts">
              <Readout label={`At ${fmt(qx, 2)} °C`} value={`${fmt(q.mean, 1)} ± ${fmt(2 * q.std, 1)}`} sub="mean ± 2 std (fish)" tone="blue" />
              <Readout label="Std there" value={fix(q.std, 2)} sub={`far from data: ${fmt(priorStd, 1)}`} />
            </div>
            <Slider label="Query temperature" value={qx} min={5} max={30} step={0.25} onInput={setQx} format={(v) => `${fmt(v, 2)} °C`} />
            <Slider label="Length scale l" value={l} min={0.5} max={20} step={0.1} onInput={setL} format={(v) => fmt(v, 1)} hint="Large l = smooth curves; small l = wiggly." />
            <Slider label="Signal std σf" value={sf} min={1} max={15} step={0.5} onInput={setSf} format={(v) => `${fmt(v, 1)} (var ${fmt(v * v, 1)})`} hint="How far curves swing from the mean. Slide: variance 25." />
            <Slider label="Noise std σn (WhiteKernel)" value={sn} min={0.05} max={5} step={0.05} onInput={setSn} format={(v) => fmt(v, 2)} hint="Small σn: the mean passes through the readings." />
            <Slider label="Prior mean" value={m0} min={0} max={30} step={0.5} onInput={setM0} format={(v) => fmt(v, 1)} hint="Where curves return far from data. Slide: 16." />
            <div class="wg-row">
              <Btn size="sm" onClick={() => setObs((o) => o.slice(0, -1))} disabled={!obs.length}>
                Remove last
              </Btn>
              <Btn size="sm" onClick={() => setSeed((s) => s + 1)}>
                New samples
              </Btn>
              <Btn size="sm" kind="ghost" onClick={() => { setObs(FISH); setL(5); setSf(5); setSn(1); setM0(16); setQx(17); setMode('post'); }}>
                Reset
              </Btn>
            </div>
            <Fb kind="info">
              {post
                ? obs.length
                  ? `Near the readings the band is narrow (std ≥ σn); away from them it widens back towards the prior std ${fmt(priorStd, 1)} and the mean returns to ${fmt(m0, 1)}.`
                  : 'No readings left: the posterior is just the prior.'
                : `Before any data each curve is one possible temperature-to-count rule: mean ${fmt(m0, 1)}, variance σf² = ${fmt(sf * sf, 1)}, length scale ${fmt(l, 1)}.`}
            </Fb>
          </div>
          <div class="gp-playground-below">
            <div class="stack-sm gp-playground-kernel" ref={refK}>
              <span class="ctl-label">RBF kernel: k(d) = σf² exp(−d² / 2l²)</span>
              <Plot
                w={WK}
                h={hK}
                x={[0, 25]}
                y={[0, sf * sf * 1.08]}
                pad={PAD_K}
                xTicks={[0, 5, 10, 15, 20, 25]}
                yTicks={[0, sf * sf]}
                yFmt={(v) => fmt(v, 0)}
                xLabel="distance d = |x − x′| (°C)"
                label="Kernel value against distance"
              >
                {({ X: KX, Y: KY }) => (
                  <g>
                    <path d={linePath(dK.map((d) => [d, sf * sf * Math.exp(-(d * d) / (2 * l * l))]), KX, KY)} fill="none" stroke="var(--biro)" stroke-width="2" />
                    {l <= 25 && (
                      <g>
                        <line x1={KX(l)} x2={KX(l)} y1={KY(0)} y2={KY(sf * sf * Math.exp(-0.5))} stroke="var(--ink-3)" stroke-dasharray="3 3" />
                        <text class="gp-playground-halo" x={KX(l) + 5} y={KY(sf * sf * Math.exp(-0.5)) - 4} font-size="11" fill="var(--ink-2)">
                          d = l
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </Plot>
              <p class="ctl-hint">
                Large l = small γ = smoother (l is in the denominator, unlike SVM's γ). This l matches an SVM γ = 1/(2l²) = {fmt(gamma, 3)}.
              </p>
            </div>
            <div class="stack-sm">
              <span class="ctl-label">Add a reading (or click the plot)</span>
              <div class="gp-playground-add">
                <Num value={nx} step={0.5} min={5} max={30} label="Temperature of the new reading (°C)" onChange={setNx} width={60} />
                <span class="faint small">°C</span>
                <Num value={ny} step={1} min={0} max={35} label="Fish count of the new reading" onChange={setNy} width={60} />
                <span class="faint small">fish</span>
                <Btn size="sm" disabled={obs.length >= MAX_OBS} onClick={() => addObs(nx, ny)}>
                  Add
                </Btn>
              </div>
              <span class="ctl-hint">{obs.length} reading{obs.length === 1 ? '' : 's'} (max {MAX_OBS}).</span>
            </div>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
