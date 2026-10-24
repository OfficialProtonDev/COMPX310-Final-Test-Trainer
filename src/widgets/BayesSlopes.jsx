// Prior × likelihood → posterior: three candidate slopes (W9b s14–15), then Bayesian linear regression on the
// thermometer log (W9b s4, s16–19).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Num, Btn, Fb, Readout, Bar } from '../ui.jsx';
import { fmt, fix, pct, clamp, linePath, bandPath, linspace } from '../lib/svg.js';
import { discretePosterior, blrPosterior, blrPredict, blrSamples, normCdf, normals } from './gp-math.js';
import { useWidth } from './b-hooks.js';

const css = `
.bayes-slopes { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
.bayes-slopes-split { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@container (min-width: 700px) { .bayes-slopes-split { grid-template-columns: minmax(0, 1fr) minmax(240px, 290px); } }
.bayes-slopes-inputs { display: grid; grid-template-columns: auto repeat(3, minmax(0, 64px)); gap: 6px 8px; align-items: center; }
.bayes-slopes-inputs .ctl-label { white-space: nowrap; }
.bayes-slopes-inputs .input.num { width: 100% !important; }
.bayes-slopes-tab { font-variant-numeric: tabular-nums; font-size: 13px; }
.bayes-slopes-tab td, .bayes-slopes-tab th { padding: 3px 6px; }
.bayes-slopes-tab th { line-height: 1.25; }
.bayes-slopes-tab .post { display: grid; gap: 3px; min-width: 56px; }
.bayes-slopes-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
.bayes-slopes-lg { display: inline-flex; align-items: center; gap: 5px; }
.bayes-slopes-formula { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; line-height: 1.6; overflow-x: auto; }
`;

const PAD = { l: 40, r: 14, t: 14, b: 38 };
const LINE_COLS = ['var(--c4)', 'var(--c1)', 'var(--c3)'];
const DASH = ['6 4', null, '2 3'];

// ------------------------------------------------------------------ part 1: three candidate slopes
function ThreeSlopes() {
  const [ref, W] = useWidth(520);
  const [slopes, setSlopes] = useState([0, 1, 2]);
  const [priors, setPriors] = useState([1, 1, 1]);
  const [sigma, setSigma] = useState(1);
  const { rows } = discretePosterior({ slopes, priors, sigma });
  const best = rows.reduce((b, r, i) => (r.post > rows[b].post ? i : b), 0);
  const h = Math.round(clamp((W - PAD.l - PAD.r) * 0.5, 170, 260) + PAD.t + PAD.b);
  const psum = priors.reduce((a, b) => a + Math.max(0, b), 0);
  const priorStr = (r) => (Number.isFinite(r.prior) ? fix(r.prior, 3) : '–');
  const equal = rows.every((r) => Math.abs(r.prior - rows[0].prior) < 1e-12);

  return (
    <div class="bayes-slopes-split">
      <div class="stack">
        <div ref={ref} class="wg-plot">
          <Plot
            w={W}
            h={h}
            x={[0, 4.5]}
            y={[16, 28]}
            pad={PAD}
            xLabel="x = hours after 08:00"
            yLabel="temperature °C"
            yTicks={[16, 18, 20, 22, 24, 26, 28]}
            label="Three candidate lines through the fixed start of 18 °C and the reading of 20 °C at x = 2"
          >
            {({ X, Y }) => (
              <g>
                {rows.map((r, i) => {
                  const y45 = 18 + r.w * 4.5;
                  const end = y45 > 28 ? [(28 - 18) / r.w, 28] : y45 < 16 ? [(16 - 18) / r.w, 16] : [4.5, y45];
                  const p = Number.isFinite(r.post) ? r.post : 0;
                  return (
                    <g key={i}>
                      <line x1={X(0)} y1={Y(18)} x2={X(end[0])} y2={Y(end[1])} stroke={LINE_COLS[i]} stroke-width={1.5 + 4 * p} stroke-dasharray={DASH[i]} opacity={0.45 + 0.55 * p} />
                      <line x1={X(2)} x2={X(2)} y1={Y(20)} y2={Y(clamp(r.pred, 16, 28))} stroke={LINE_COLS[i]} stroke-width="1.2" stroke-dasharray="1 2" />
                    </g>
                  );
                })}
                {rows.map((r, i) => {
                  const y45 = 18 + r.w * 4.5;
                  if (y45 > 28 || y45 < 16) return null;
                  const ys = rows.map((q) => 18 + q.w * 4.5);
                  const clash = ys.some((v, j) => j < i && Math.abs(Y(v) - Y(y45)) < 13);
                  return (
                    <text key={'t' + i} class="bayes-slopes-halo" x={X(4.45)} y={Y(y45) + (clash ? 15 : -6)} text-anchor="end" font-size="11.5" font-weight="700" fill={LINE_COLS[i]}>
                      w = {fmt(r.w, 2)}: {Number.isFinite(r.post) ? pct(r.post, 1) : '–'}
                    </text>
                  );
                })}
                <circle cx={X(0)} cy={Y(18)} r="5" fill="var(--plot-bg)" stroke="var(--ink)" stroke-width="2" />
                <circle cx={X(2)} cy={Y(20)} r="6" fill="var(--ink)" stroke="var(--plot-bg)" stroke-width="1.5" />
                <text class="bayes-slopes-halo" x={X(2) - 9} y={Y(20) - 9} text-anchor="end" font-size="12" font-weight="700" fill="var(--ink)">
                  reading 20 °C
                </text>
                <text class="bayes-slopes-halo" x={X(0) + 9} y={Y(18) + 16} font-size="11.5" fill="var(--ink-2)">
                  fixed start 18 °C
                </text>
              </g>
            )}
          </Plot>
          <div class="wg-legend">Line thickness = posterior probability. Dotted drops = the miss e at x = 2.</div>
        </div>
        <div class="mini-wrap stack-sm">
          <table class="mini bayes-slopes-tab" aria-label="Prior, likelihood and posterior for each candidate slope">
            <thead>
              <tr>
                <th>w</th>
                <th>pred.</th>
                <th>miss e</th>
                <th>score</th>
                <th>prior × score</th>
                <th>posterior</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} class={i === best ? 'hl' : ''}>
                  <td>{fmt(r.w, 2)}</td>
                  <td>{fmt(r.pred, 2)}</td>
                  <td>{fmt(r.miss, 2)}</td>
                  <td>{fix(r.score, 3)}</td>
                  <td>{Number.isFinite(r.joint) ? fix(r.joint, 3) : '–'}</td>
                  <td>
                    <div class="post">
                      <b>{Number.isFinite(r.post) ? pct(r.post, 1) : '–'}</b>
                      <Bar value={r.post} tone={i === best ? 'tick' : 'ink'} label={`posterior ${pct(r.post, 1)}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="ctl-hint">pred. = 18 + 2w · miss e = 20 − pred. · score = exp(−e²/2σ²), the slide's relative score</div>
        </div>
        {psum > 0 && (
          <div class="bayes-slopes-formula" aria-live="polite">
            p(w = {fmt(rows[best].w, 2)} | D) = {priorStr(rows[best])} × {fix(rows[best].score, 3)} / ({rows.map((r) => `${priorStr(r)} × ${fix(r.score, 3)}`).join(' + ')}) ≈{' '}
            {fix(rows[best].post, 3)}
          </div>
        )}
      </div>
      <div class="wg-controls">
        <Slider label="Noise σ (°C)" value={sigma} min={0.5} max={3} step={0.05} onInput={setSigma} format={(v) => fmt(v, 2)} hint="How big a miss is still normal. Slides: σ = 1." />
        <div class="bayes-slopes-inputs">
          <span class="ctl-label">Slopes w</span>
          {slopes.map((w, i) => (
            <Num key={i} value={w} step={0.5} label={`Candidate slope ${i + 1}`} onChange={(v) => setSlopes(slopes.map((q, j) => (j === i ? v : q)))} />
          ))}
          <span class="ctl-label">Prior weight</span>
          {priors.map((p, i) => (
            <Num key={i} value={p} step={1} min={0} label={`Prior weight for slope ${i + 1}`} onChange={(v) => setPriors(priors.map((q, j) => (j === i ? Math.max(0, v) : q)))} />
          ))}
        </div>
        <p class="ctl-hint">Prior weights are rescaled to sum to 1 (default equal: 1/3 each).</p>
        {psum > 0 ? (
          <Fb kind="info">
            {equal
              ? `With equal priors the posterior just follows the likelihood: the slope whose line passes closest to the reading wins (${pct(rows[best].post, 1)}).`
              : `The prior tilts the result: posterior ∝ prior × likelihood, so a strongly believed slope can survive a worse fit.`}
          </Fb>
        ) : (
          <Fb kind="bad">All prior weights are 0, so every posterior is undefined. Give at least one slope a positive weight.</Fb>
        )}
        <Btn size="sm" onClick={() => { setSlopes([0, 1, 2]); setPriors([1, 1, 1]); setSigma(1); }}>
          Reset to the slide
        </Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ part 2: continuous slopes on the thermometer log
const XS = [0, 1, 2, 6, 8];
const YS = [18, 19.3, 20, 22, 20];
const ALPHA = 0.001; // prior w ~ N(0, α⁻¹I): very weak
const Z = normals(12, 2, 9).map((z) => [z[0], z[1]]);

function Thermometer() {
  const [ref, W] = useWidth(560);
  const [k, setK] = useState(3);
  const [sigma, setSigma] = useState(1);
  const clipId = 'bayes-slopes-clip-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const beta = 1 / (sigma * sigma);
  const post = useMemo(() => blrPosterior(XS.slice(0, k), YS.slice(0, k), ALPHA, beta), [k, sigma]);
  const xs = linspace(-1, 12, 131);
  const pred = xs.map((x) => blrPredict(post, beta, x));
  const noon = blrPredict(post, beta, 4);
  const pAbove = 1 - normCdf((20 - noon.mean) / noon.std);
  const lines = blrSamples(post, Z);
  const h = Math.round(clamp((W - PAD.l - PAD.r) * 0.62, 190, 360) + PAD.t + PAD.b);
  const y0 = 10;
  const y1 = 30;
  const note =
    k === 1
      ? 'One reading pins the 08:00 level but says nothing about the slope, so the plausible lines fan out in every direction.'
      : k <= 3
        ? 'Morning readings only: the lines agree near the data and spread out further away, so noon is an uncertain extrapolation.'
        : k === 4
          ? 'The 14:00 reading sits on the far side of noon, so the spread at noon collapses.'
          : 'All five readings: the band at noon is about ±2σ of noise. A straight line cannot follow the rise and fall, though.';

  return (
    <div class="bayes-slopes-split">
      <div ref={ref} class="wg-plot">
        <Plot
          w={W}
          h={h}
          x={[-1, 12]}
          y={[y0, y1]}
          pad={PAD}
          xTicks={[0, 2, 4, 6, 8, 10, 12]}
          yTicks={[10, 14, 18, 22, 26, 30]}
          xLabel="x = hours after 08:00"
          yLabel="temperature °C"
          label={`Bayesian linear regression using the first ${k} readings: sampled lines, mean line and plus or minus two standard deviation band`}
        >
          {({ X, Y, w, h: hh, pad }) => (
            <g>
              <defs>
                <clipPath id={clipId}>
                  <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={hh - pad.t - pad.b} />
                </clipPath>
              </defs>
              <g clip-path={`url(#${clipId})`}>
                <path d={bandPath(xs, pred.map((p) => clamp(p.mean - 2 * p.std, y0 - 50, y1 + 50)), pred.map((p) => clamp(p.mean + 2 * p.std, y0 - 50, y1 + 50)), X, Y)} fill="var(--biro-soft)" fill-opacity="0.75" />
                {lines.map((wv, i) => (
                  <line key={i} x1={X(-1)} y1={Y(wv[0] - wv[1])} x2={X(12)} y2={Y(wv[0] + 12 * wv[1])} stroke="var(--c5)" stroke-width="1.1" opacity="0.55" />
                ))}
                <path d={linePath(xs.map((x, i) => [x, pred[i].mean + 2 * pred[i].std]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="1.3" stroke-dasharray="5 4" />
                <path d={linePath(xs.map((x, i) => [x, pred[i].mean - 2 * pred[i].std]), X, Y)} fill="none" stroke="var(--biro)" stroke-width="1.3" stroke-dasharray="5 4" />
                <line x1={X(-1)} y1={Y(post.m[0] - post.m[1])} x2={X(12)} y2={Y(post.m[0] + 12 * post.m[1])} stroke="var(--biro)" stroke-width="2.8" />
                <line x1={X(-1)} x2={X(12)} y1={Y(20)} y2={Y(20)} stroke="var(--marker)" stroke-width="1" stroke-dasharray="2 3" />
              </g>
              <line x1={X(4)} x2={X(4)} y1={pad.t} y2={hh - pad.b} stroke="var(--ink-3)" stroke-dasharray="4 4" />
              <text class="bayes-slopes-halo" x={X(4) + 6} y={pad.t + 13} font-size="11.5" font-weight="700" fill="var(--ink-2)">
                12:00 missing
              </text>
              <text class="bayes-slopes-halo" x={X(12) - 4} y={Y(20) - 5} text-anchor="end" font-size="11" fill="var(--marker)">
                20 °C
              </text>
              {Math.abs(noon.mean) < 100 && (
                <g>
                  <line x1={X(4)} x2={X(4)} y1={Y(clamp(noon.mean - 2 * noon.std, y0, y1))} y2={Y(clamp(noon.mean + 2 * noon.std, y0, y1))} stroke="var(--biro-2)" stroke-width="3" />
                  {noon.mean > y0 && noon.mean < y1 && <circle cx={X(4)} cy={Y(noon.mean)} r="5" fill="var(--biro)" stroke="var(--plot-bg)" stroke-width="1.5" />}
                </g>
              )}
              {XS.map((x, i) => (
                <circle
                  key={x}
                  cx={X(x)}
                  cy={Y(YS[i])}
                  r="5.5"
                  fill={i < k ? 'var(--ink)' : 'var(--plot-bg)'}
                  stroke="var(--ink)"
                  stroke-width="1.8"
                  stroke-dasharray={i < k ? null : '2 2'}
                />
              ))}
            </g>
          )}
        </Plot>
        <div class="wg-legend" aria-hidden="true">
          <span class="bayes-slopes-lg"><svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="var(--ink)" /></svg>reading used</span>
          <span class="bayes-slopes-lg"><svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 2" /></svg>not yet</span>
          <span class="bayes-slopes-lg"><svg width="20" height="12" viewBox="0 0 20 12"><line x1="1" x2="19" y1="6" y2="6" stroke="var(--c5)" stroke-width="1.5" /></svg>12 lines drawn from the posterior</span>
          <span class="bayes-slopes-lg"><svg width="20" height="12" viewBox="0 0 20 12"><line x1="1" x2="19" y1="6" y2="6" stroke="var(--biro)" stroke-width="2.8" /></svg>mean line</span>
          <span class="bayes-slopes-lg"><svg width="20" height="12" viewBox="0 0 20 12"><rect x="1" y="1" width="18" height="10" fill="var(--biro-soft)" stroke="var(--biro)" stroke-dasharray="3 2" /></svg>mean ± 2 std of a new reading (≈ 95%)</span>
        </div>
      </div>
      <div class="wg-controls">
        <Slider label="Use the first k readings" value={k} min={1} max={5} step={1} onInput={setK} format={(v) => `${v} of 5`} hint={`Readings at ${XS.slice(0, k).map((x) => `${String(8 + x).padStart(2, '0')}:00`).join(', ')}`} />
        <Slider label="Noise σ (°C)" value={sigma} min={0.25} max={3} step={0.05} onInput={setSigma} format={(v) => fmt(v, 2)} hint="β = 1/σ² is the noise precision." />
        <div class="readouts">
          <Readout label="At 12:00" value={Math.abs(noon.mean) < 1000 ? `${fmt(noon.mean, 1)} ± ${fmt(2 * noon.std, 1)}` : '–'} sub="°C, mean ± 2 std" tone="blue" />
          <Readout label="P(T ≥ 20 °C)" value={pct(pAbove, 0)} sub="from the Gaussian at noon" />
        </div>
        <div class="calc-steps">
          <div>mean line: {fmt(post.m[0], 2)} {post.m[1] < 0 ? '−' : '+'} {fmt(Math.abs(post.m[1]), 2)}x</div>
          <div class="why">std² = 1/β + φᵀSφ: noise plus uncertainty about the line. Prior w ~ N(0, α⁻¹I), α = 0.001 (very weak).</div>
        </div>
        <Fb kind="info">{note}</Fb>
      </div>
    </div>
  );
}

export default function BayesSlopes() {
  const [part, setPart] = useState('three');
  return (
    <WidgetFrame
      title="Prior × likelihood → posterior"
      lead={
        part === 'three'
          ? 'Three candidate slopes, one reading (20 °C at x = 2). Change the noise σ, the slopes or the prior and watch the posterior.'
          : 'Bayesian linear regression on the thermometer log: add readings one at a time and watch the plausible lines narrow.'
      }
      actions={
        <Seg
          label="Part"
          value={part}
          onChange={setPart}
          options={[
            { value: 'three', label: 'Three slopes' },
            { value: 'all', label: 'All slopes' },
          ]}
        />
      }
      foot={
        <span>
          A single number hides uncertainty: the posterior is a spread of plausible lines that narrows as data arrives and widens away
          from the data. In sklearn, BayesianRidge().predict(X, return_std=True) gives the mean and std; mean ± 2 std ≈ 95%.
        </span>
      }
    >
      <style>{css}</style>
      <div class="bayes-slopes">{part === 'three' ? <ThreeSlopes /> : <Thermometer />}</div>
    </WidgetFrame>
  );
}
