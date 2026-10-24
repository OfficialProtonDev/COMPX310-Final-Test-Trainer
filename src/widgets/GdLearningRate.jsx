// Gradient descent: the learning rate on a 1-D bowl, and batch vs mini-batch vs stochastic paths on a 2-D cost (W5 s13-23).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Fb, Readout } from '../ui.jsx';
import { fmt, fix, linspace, linePath, clamp } from '../lib/svg.js';
import {
  ETAS, THETA_START, THETA_MIN, J1, dJ1, gd1d, status1d,
  makeData2d, design, costForm, ellipse, gdPath, toUnscaled, cost,
} from './gd-learning-rate-math.js';
import { useWidth, marker } from './d-shared.js';

const css = `
.gd-learning-rate-wrap { max-width: 640px; }
.gd-learning-rate-steps b { color: var(--ink); }
.gd-learning-rate-tab td, .gd-learning-rate-tab th { white-space: nowrap; }
.gd-learning-rate-sw { display: inline-flex; align-items: center; gap: 6px; }
.gd-learning-rate-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
`;

const STATUS = {
  slow: { kind: 'hint', title: 'Too small: slow', text: (s, th) => `After 20 steps θ = ${fix(th, 2)}, still ${fix(s.left, 2)} from the minimum. Safe, but it needs many more steps.` },
  converges: { kind: 'good', title: 'Converges', text: (s, th) => `θ walks down the bowl and settles at the minimum (θ₂₀ = ${fix(th, 3)}).` },
  oscillates: { kind: 'hint', title: 'Overshoots but converges', text: () => 'Each step jumps past the minimum to the other side; the jumps shrink, so it still settles, more slowly than η = 0.5.' },
  bounces: { kind: 'bad', title: 'Bounces for ever', text: () => 'η = 1 jumps from θ = −2 to 8 and back again: the distance to the minimum never shrinks.' },
  diverges: { kind: 'bad', title: 'Diverges', text: () => 'Every step overshoots further than the last, so θ and the cost blow up. Use a smaller learning rate.' },
};

// ---------------------------------------------------------------- panel 1
function OneD() {
  const [ei, setEi] = useState(ETAS.indexOf(0.1));
  const eta = ETAS[ei];
  const th = useMemo(() => gd1d(eta), [eta]);
  const st = status1d(eta);
  const S = STATUS[st.key];
  const [ref, width] = useWidth(360);
  const clip = 'gd1-clip-' + useId();
  const W = Math.max(290, Math.min(width, 640));
  const H = Math.round(clamp(W * 0.62, 230, 340));
  const XD = [-5, 11];
  const YD = [0, 66];
  const curve = linspace(XD[0], XD[1], 161).map((t) => [t, J1(t)]);
  const out = th.findIndex((t) => t < XD[0] || t > XD[1]);
  const shown = out < 0 ? th : th.slice(0, out + 1);
  const par = (v) => (v < 0 ? `(${fmt(v, 3)})` : fmt(v, 3));
  const step = (k) => `θ${sub(k + 1)} = ${fmt(th[k], 3)} − ${fmt(eta, 2)} × ${par(dJ1(th[k]))} = ${fmt(th[k + 1], 3)}`;
  return (
    <div class="wg-split">
      <div class="wg-controls">
        <Slider label="Learning rate η" value={ei} min={0} max={ETAS.length - 1} step={1} onInput={setEi} format={(i) => fmt(ETAS[i], 2)} hint="Log-like steps: 0.01 … 1.1" />
        <Fb kind={S.kind}>
          <b>{S.title}.</b> {S.text(st, th[20])}
          {out >= 0 && ` Step ${out} leaves the chart (θ = ${fmt(th[out], 1)}).`}
        </Fb>
        <div class="readouts">
          <Readout label="θ after 20 steps" value={Math.abs(th[20]) < 1e5 ? fmt(th[20], 3) : th[20].toExponential(1)} sub="minimum at θ = 3" />
          <Readout label="Step multiplier" value={fmt(st.factor, 2)} sub="1 − 2η: distance × this" tone={Math.abs(st.factor) < 1 ? 'good' : 'bad'} />
        </div>
      </div>
      <div class="wg-plot">
        <div class="gd-learning-rate-wrap" ref={ref}>
          <Plot w={W} h={H} x={XD} y={YD} pad={{ l: 40, r: 12, t: 12, b: 38 }} xTicks={[-4, -2, 0, 2, 4, 6, 8, 10]} yTicks={[0, 20, 40, 60]} xLabel="θ" yLabel="cost J(θ)" label={`Cost curve with ${shown.length - 1} gradient steps at learning rate ${eta}`}>
            {({ X, Y, w, h, pad }) => (
              <g>
                <defs>
                  <clipPath id={clip}>
                    <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={h - pad.t - pad.b} />
                  </clipPath>
                  <marker id={clip + '-a'} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0.5 L7.5,4 L0,7.5 z" fill="var(--c1)" />
                  </marker>
                </defs>
                <line x1={X(THETA_MIN)} x2={X(THETA_MIN)} y1={pad.t + 16} y2={Y(0)} stroke="var(--tick)" stroke-width="1.5" stroke-dasharray="5 4" />
                <path d={linePath(curve, X, Y)} fill="none" stroke="var(--ink-2)" stroke-width="2" />
                <g clip-path={`url(#${clip})`}>
                  {shown.slice(1).map((t, i) => {
                    const a = shown[i];
                    const x1 = X(a);
                    const y1 = Y(J1(a));
                    const x2 = X(t);
                    const y2 = Y(J1(t));
                    if (Math.hypot(x2 - x1, y2 - y1) < 9) return null;
                    return <line key={'s' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--c1)" stroke-width="1.6" marker-end={`url(#${clip}-a)`} opacity={Math.max(0.35, 1 - i * 0.04)} />;
                  })}
                  {shown.map((t, i) => (
                    <circle key={'p' + i} cx={X(t)} cy={Y(J1(t))} r={i === 0 ? 6 : 4.5} fill={i === 0 ? 'var(--hint)' : 'var(--c1)'} stroke="var(--paper)" stroke-width="1.2" opacity={i === 0 ? 1 : Math.max(0.4, 1 - i * 0.03)} />
                  ))}
                </g>
                <text class="lbl-strong gd-learning-rate-halo" x={X(THETA_START) + 10} y={Y(J1(THETA_START)) - 8}>
                  start θ₀ = −2
                </text>
                <text class="lbl gd-learning-rate-halo" x={X(THETA_MIN)} y={pad.t + 10} text-anchor="middle">
                  minimum θ = 3
                </text>
              </g>
            )}
          </Plot>
        </div>
        <div class="wg-note">J(θ) = (θ − 3)² + 1, starting at θ₀ = −2; the first 20 steps are drawn.</div>
        <div class="calc-steps gd-learning-rate-steps">
          <div class="why">θ ← θ − η·J′(θ), with J′(θ) = 2(θ − 3)</div>
          <div>{step(0)}</div>
          <div>{step(1)}</div>
          <div>{step(2)}</div>
          <div class="why">
            J″ = 2, so each step multiplies the distance to θ = 3 by 1 − 2η: converges for η &lt; 1, bounces at η = 1, diverges above. On
            the slide's regression data η = 0.5 already diverged: the safe range depends on how steep the cost is.
          </div>
        </div>
      </div>
    </div>
  );
}

const sub = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

// ---------------------------------------------------------------- panel 2
const ALGOS = [
  { key: 'sgd', name: 'Stochastic', batch: 1, seed: 3, col: 'var(--c2)', shape: 'square', r: 2.2, lw: 0.8 },
  { key: 'mini', name: 'Mini-batch (10)', batch: 10, seed: 2, col: 'var(--c3)', shape: 'plus', r: 4.5, lw: 1.6 },
  { key: 'batch', name: 'Batch', batch: 50, seed: 1, col: 'var(--c1)', shape: 'circle', r: 4.2, lw: 2.4 },
];
const ETA2 = 0.1;
const EPOCHS = 20;
const START = [1, 0.6]; // in standardised-x parameters
const DATA = makeData2d();
const RAW = design(DATA, false).map((r) => r[1]);
const RAW_RANGE = [Math.min(...RAW), Math.max(...RAW)];
// batch GD's excess cost after all epochs, [unscaled, scaled]: same starting model, same η
const BATCH20 = [false, true].map((sc) => {
  const X = design(DATA, sc);
  const p = gdPath(X, DATA.y, { eta: ETA2, batch: 50, epochs: EPOCHS, start: sc ? START : toUnscaled(START) });
  return cost(X, DATA.y, p.path[p.path.length - 1]) - costForm(X, DATA.y).jmin;
});

function TwoD() {
  const [scaled, setScaled] = useState(true);
  const [epochs, setEpochs] = useState(3);
  const [ref, width] = useWidth(360);
  const clip = 'gd2-clip-' + useId();

  const sim = useMemo(() => {
    const X = design(DATA, scaled);
    const form = costForm(X, DATA.y);
    const start = scaled ? START : toUnscaled(START);
    const paths = Object.fromEntries(ALGOS.map((a) => [a.key, gdPath(X, DATA.y, { eta: ETA2, batch: a.batch, epochs: EPOCHS, start, seed: a.seed })]));
    return { X, form, start, paths };
  }, [scaled]);

  const W = Math.max(290, Math.min(width, 640));
  const H = Math.round(clamp(W * 0.72, 250, 420));
  const pad = { l: 40, r: 12, t: 12, b: 38 };
  // equal-aspect window around the start and the minimum
  const [o0, o1] = sim.form.opt;
  const [s0, s1] = sim.start;
  let x0 = Math.min(o0, s0) - 0.9;
  let x1 = Math.max(o0, s0) + 1.1;
  let y0 = Math.min(o1, s1) - 0.9;
  let y1 = Math.max(o1, s1) + 1.1;
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const k = Math.max((x1 - x0) / pw, (y1 - y0) / ph);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  [x0, x1] = [cx - (k * pw) / 2, cx + (k * pw) / 2];
  [y0, y1] = [cy - (k * ph) / 2, cy + (k * ph) / 2];

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((i) => (0.5 * i) ** 2);
  const upto = (p) => p.path.slice(0, p.epochEnds[Math.min(epochs, p.epochEnds.length - 1)] + 1);
  const rows = ALGOS.map((a) => {
    const p = sim.paths[a.key];
    const pts = upto(p);
    const last = pts[pts.length - 1];
    return { ...a, pts, updates: pts.length - 1, excess: cost(sim.X, DATA.y, last) - sim.form.jmin };
  });
  const after20 = (sc) => BATCH20[sc ? 1 : 0];

  return (
    <div class="wg-split">
      <div class="wg-controls">
        <Seg
          label="Feature scaling"
          value={scaled}
          onChange={setScaled}
          options={[
            { value: true, label: 'Scaled x' },
            { value: false, label: 'Unscaled x' },
          ]}
        />
        <Slider label="Epochs (passes over the 50 points)" value={epochs} min={1} max={EPOCHS} step={1} onInput={setEpochs} format={(v) => String(v)} />
        <div class="mini-wrap">
          <table class="mini gd-learning-rate-tab" aria-label="Progress of each algorithm: updates made and cost above the minimum">
            <thead>
              <tr>
                <th class="l">After {epochs} epoch{epochs > 1 ? 's' : ''}</th>
                <th>updates</th>
                <th title="cost above the minimum cost; the same model gives the same cost with scaled or unscaled x">J − J*</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td class="l">
                    <span class="gd-learning-rate-sw">
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d={marker(r.shape, 6, 6, r.shape === 'square' ? 4.2 : 4.4)} fill={r.shape === 'plus' ? 'none' : r.col} stroke={r.col} stroke-width={r.shape === 'plus' ? 2 : 0} />
                      </svg>
                      {r.name}
                    </span>
                  </td>
                  <td>{r.updates}</td>
                  <td>{fix(r.excess, r.excess < 0.1 ? 3 : 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div class="wg-plot">
        <div class="gd-learning-rate-wrap" ref={ref}>
          <Plot w={W} h={H} x={[x0, x1]} y={[y0, y1]} pad={pad} xLabel="θ₀ (intercept)" yLabel="θ₁ (slope)" label={`Cost contours with batch, mini-batch and stochastic gradient descent paths after ${epochs} epochs`}>
            {({ X, Y }) => (
              <g>
                <defs>
                  <clipPath id={clip}>
                    <rect x={pad.l} y={pad.t} width={pw} height={ph} />
                  </clipPath>
                </defs>
                <g clip-path={`url(#${clip})`}>
                  {levels.map((dj, i) => (
                    <path key={dj} d={linePath(ellipse(sim.form, dj), X, Y) + 'Z'} fill={i === 0 ? 'var(--c1-soft)' : 'none'} stroke="var(--rule-2)" stroke-width="1.1" />
                  ))}
                  {rows.map((r) => (
                    <g key={r.key}>
                      <path d={linePath(r.pts, X, Y)} fill="none" stroke={r.col} stroke-width={r.lw} stroke-linejoin="round" opacity={r.key === 'sgd' ? (scaled ? 0.6 : 0.22) : 1} />
                      <path
                        d={r.pts.map((p) => marker(r.shape, X(p[0]), Y(p[1]), r.r)).join('')}
                        fill={r.shape === 'plus' ? 'none' : r.col}
                        stroke={r.shape === 'plus' ? r.col : 'none'}
                        stroke-width={r.shape === 'plus' ? 1.8 : 0}
                      />
                    </g>
                  ))}
                </g>
                <path d={marker('cross', X(o0), Y(o1), 6)} stroke="var(--ink)" stroke-width="2.4" fill="none" />
                <text class="lbl-strong gd-learning-rate-halo" x={X(o0) + 9} y={Y(o1) - 9}>
                  minimum
                </text>
                <circle cx={X(s0)} cy={Y(s1)} r="5.5" fill="var(--hint)" stroke="var(--paper)" stroke-width="1.2" />
                <text class="lbl-strong gd-learning-rate-halo" x={X(s0) + 9} y={Y(s1) + 15}>
                  start
                </text>
              </g>
            )}
          </Plot>
        </div>
        <div class="wg-note">
          Linear regression y = θ₀ + θ₁x on 50 points; rings are equal-cost contours. All three use the same constant η = {ETA2}.
        </div>
        {scaled ? (
          <Fb kind="info">
            SGD makes 50 one-example updates per epoch, so it gets close fastest, but with a constant η it keeps bouncing around the
            minimum. Batch GD takes one exact step per epoch: smooth, and it converges to the exact minimum. Mini-batch is in between.
          </Fb>
        ) : (
          <Fb kind="hint">
            Same data and η = {ETA2}, but x is not standardised (raw values {fmt(RAW_RANGE[0], 1)} to {fmt(RAW_RANGE[1], 1)}), so the bowl is a long tilted valley: batch GD
            zig-zags across it and then crawls along it. After 20 epochs its cost is still {fix(after20(false), 2)} above the minimum
            (scaled: {fix(after20(true), 3)}), and SGD jumps about wildly. Fix: StandardScaler before gradient descent.
          </Fb>
        )}
      </div>
    </div>
  );
}

export default function GdLearningRate({ panel: panel0 = '1d' }) {
  const [panel, setPanel] = useState(panel0);
  return (
    <WidgetFrame
      title="Gradient descent and the learning rate"
      lead={
        panel === '1d'
          ? 'Change the learning rate η and watch the first 20 steps down the cost curve.'
          : 'Move the epochs slider to compare batch, mini-batch and stochastic GD; then switch to unscaled x.'
      }
      foot={
        <span>
          η too small = slow, too big = overshoots and diverges; scale features first, or the bowl becomes a long valley that GD
          crawls along. SGD is noisy but gets close fastest and never settles exactly with a constant η; batch GD is smooth and
          reaches the exact minimum.
        </span>
      }
    >
      <style>{css}</style>
      <Seg
        label="Panel"
        value={panel}
        onChange={setPanel}
        options={[
          { value: '1d', label: '1-D: learning rate' },
          { value: '2d', label: '2-D: batch vs SGD' },
        ]}
      />
      {panel === '1d' ? <OneD /> : <TwoD />}
    </WidgetFrame>
  );
}
