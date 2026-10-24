// Activation functions, their slopes, saturation and vanishing gradients (W6a s4-7, W6b s2; 2024 Q13, 2025 Q19).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg } from '../ui.jsx';
import { fmt, linspace, linePath, clamp } from '../lib/svg.js';
import { ACTS, SAT, saturatedIntervals } from './activations-math.js';
import { useWidth } from './d-shared.js';

const STYLE = {
  step: { col: 'var(--c2)', dash: '', w: 1.8 },
  sigmoid: { col: 'var(--c3)', dash: '7 4', w: 2.4 },
  tanh: { col: 'var(--c1)', dash: '', w: 2.4 },
  relu: { col: 'var(--c5)', dash: '9 3 2 3', w: 2.4 },
};
const KEYS = ['step', 'sigmoid', 'tanh', 'relu'];
const ZD = [-5, 5];

const css = `
.activations-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.activations-chip { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--rule-2); background: var(--paper); border-radius: 999px; padding: 4px 11px 4px 9px; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
.activations-chip[aria-pressed="true"] { border-color: var(--ink-2); color: var(--ink); background: var(--paper-2); }
.activations-chip[aria-pressed="false"] { opacity: 0.6; text-decoration: line-through; }
.activations-plots { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.activations-cap { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.activations-tab td, .activations-tab th { white-space: nowrap; }
.activations-notes { display: grid; gap: 4px; margin: 0; padding-left: 18px; font-size: 13.5px; color: var(--ink-2); }
.activations-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
`;

function Swatch({ k }) {
  const s = STYLE[k];
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
      <line x1="1" y1="5" x2="21" y2="5" stroke={s.col} stroke-width={s.w + 0.4} stroke-dasharray={s.dash} />
    </svg>
  );
}

/** Small-number display: 0.000183 -> 1.8×10⁻⁴ */
function sci(v) {
  if (!Number.isFinite(v)) return '–';
  if (v === 0) return '0';
  if (Math.abs(v) >= 0.001) return fmt(v, 3);
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  const sup = String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  return `${fmt(m, 1)}×10${sup}`;
}

function Panel({ kind, on, focus, z, bands }) {
  const [ref, width] = useWidth(300);
  const clip = 'act-' + kind + '-' + useId();
  const W = Math.max(260, Math.min(width, 440));
  const H = Math.round(clamp(W * 0.7, 200, 300));
  const deriv = kind === 'd';
  const yd = deriv ? [-0.12, 1.15] : [-1.25, 1.5];
  const zs = linspace(ZD[0], ZD[1], 401);
  const fn = (k) => (deriv ? ACTS[k].d : ACTS[k].f);
  // draw the step / ReLU jumps as vertical segments, like the slide
  const path = (k, X, Y) => {
    const f = fn(k);
    const pts = zs.map((t) => [t, f(t === 0 ? 1e-9 : t)]);
    if ((k === 'step' && !deriv) || (k === 'relu' && deriv)) {
      const i = zs.findIndex((t) => t >= 0);
      pts.splice(i, 0, [0, 0]);
    }
    return linePath(pts, X, Y);
  };
  return (
    <div ref={ref}>
      <div class="activations-cap">{deriv ? 'Derivatives (slopes)' : 'Activation functions'}</div>
      <Plot w={W} h={H} x={ZD} y={yd} pad={{ l: 38, r: 10, t: 10, b: 34 }} xTicks={[-4, -2, 0, 2, 4]} yTicks={deriv ? [0, 0.25, 0.5, 0.75, 1] : [-1, -0.5, 0, 0.5, 1, 1.5]} xLabel="z" yLabel={deriv ? 'f′(z)' : 'f(z)'} label={deriv ? 'Derivatives of the activation functions' : 'Activation functions'}>
        {({ X, Y, h, pad, w }) => (
          <g>
            <defs>
              <clipPath id={clip}>
                <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={h - pad.t - pad.b} />
              </clipPath>
            </defs>
            {bands.map(([a, b], i) => (
              <rect key={i} x={X(a)} y={pad.t} width={Math.max(0, X(b) - X(a))} height={h - pad.t - pad.b} fill="var(--hint-soft)" opacity="0.7" />
            ))}
            {bands.length > 0 && (
              <text class="lbl activations-halo" x={X(bands[bands.length - 1][0]) + 4} y={pad.t + 13}>
                {focus === 'step' ? 'Step: slope 0 everywhere' : focus === 'relu' ? 'slope 0 for z < 0' : 'saturated'}
              </text>
            )}
            {deriv && <line x1={X(ZD[0])} x2={X(ZD[1])} y1={Y(SAT)} y2={Y(SAT)} stroke="var(--hint)" stroke-dasharray="3 3" />}
            <g clip-path={`url(#${clip})`}>
              {KEYS.filter((k) => on[k]).map((k) => (
                <path key={k} d={path(k, X, Y)} fill="none" stroke={STYLE[k].col} stroke-width={STYLE[k].w + (k === focus ? 1 : 0)} stroke-dasharray={STYLE[k].dash} opacity={k === focus ? 1 : 0.75} />
              ))}
            </g>
            <line x1={X(z)} x2={X(z)} y1={pad.t} y2={h - pad.b} stroke="var(--ink)" stroke-width="1.2" />
            {KEYS.filter((k) => on[k]).map((k) => {
              const v = fn(k)(z);
              if (!Number.isFinite(v) || v < yd[0] || v > yd[1]) return null;
              return <circle key={k} cx={X(z)} cy={Y(v)} r={k === focus ? 5.5 : 4} fill={STYLE[k].col} stroke="var(--paper)" stroke-width="1.2" />;
            })}
          </g>
        )}
      </Plot>
    </div>
  );
}

export default function Activations() {
  const [on, setOn] = useState({ step: true, sigmoid: true, tanh: true, relu: true });
  const [focus, setFocus] = useState('sigmoid');
  const [z, setZ] = useState(3);
  const [L, setL] = useState(5);
  const bands = useMemo(() => saturatedIntervals(focus, ZD[0], ZD[1]), [focus]);
  const toggle = (k) => setOn((o) => ({ ...o, [k]: !o[k] }));
  const vis = KEYS.filter((k) => on[k]);

  return (
    <WidgetFrame
      title="Activation functions and vanishing gradients"
      lead="Move z to read each function and its slope. Shaded = where the chosen function's slope is below 0.05, so almost no gradient flows back."
      foot={
        <span>
          ReLU is the default for hidden layers: its slope is 1 for every z &gt; 0, so gradients survive many layers. Sigmoid and
          tanh saturate for large |z| (slope near 0), and backprop multiplies one slope per layer, so gradients vanish in deep nets.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <div class="activations-chips" role="group" aria-label="Show functions">
            {KEYS.map((k) => (
              <button type="button" key={k} class="activations-chip" aria-pressed={on[k]} onClick={() => toggle(k)}>
                <Swatch k={k} />
                {ACTS[k].label}
              </button>
            ))}
          </div>
          <div class="stack-sm">
            <span class="ctl-label">Shade where the slope is below 0.05 for</span>
            <Seg label="Shade where the slope is below 0.05 for" value={focus} onChange={setFocus} options={KEYS.map((k) => ({ value: k, label: ACTS[k].label }))} />
          </div>
          <Slider label="z (weighted input to the unit)" value={z} min={-5} max={5} step={0.1} onInput={(v) => setZ(+v.toFixed(1))} format={(v) => fmt(v, 1)} />
          <Slider label="Layers L the gradient passes back through" value={L} min={1} max={10} step={1} onInput={setL} format={(v) => String(v)} />
        </div>
        <div class="wg-plot">
          <div class="activations-plots">
            <Panel kind="f" on={on} focus={focus} z={z} bands={bands} />
            <Panel kind="d" on={on} focus={focus} z={z} bands={bands} />
          </div>
          <div class="mini-wrap">
            <table class="mini activations-tab" aria-label={`Values and slopes at z = ${fmt(z, 1)}`}>
              <thead>
                <tr>
                  <th class="l">at z = {fmt(z, 1)}</th>
                  <th>f(z)</th>
                  <th>slope f′(z)</th>
                  <th>
                    f′(z)<sup>{L}</sup>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vis.map((k) => {
                  const d = ACTS[k].d(z);
                  const sat = Number.isFinite(d) && Math.abs(d) < SAT;
                  return (
                    <tr key={k} class={k === focus ? 'hl' : ''}>
                      <td class="l">
                        <Swatch k={k} /> {ACTS[k].label}
                      </td>
                      <td>{fmt(ACTS[k].f(z), 3)}</td>
                      <td class={sat ? 'bad' : d === 1 ? 'good' : ''}>
                        {Number.isFinite(d) ? fmt(d, 3) + (sat ? (k === 'sigmoid' || k === 'tanh' ? ' (saturated)' : ' (flat)') : '') : k === 'relu' ? '0 or 1 (kink)' : 'undefined (jump)'}
                      </td>
                      <td class={Number.isFinite(d) && d ** L < 0.01 ? 'bad' : ''}>{Number.isFinite(d) ? sci(d ** L) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div class="wg-note">
            Backprop multiplies the error signal by the slope f′(z) once per layer (along with the weights). The sigmoid's slope is at
            most 0.25, so even at z = 0 ten sigmoid layers shrink it by 0.25¹⁰ ≈ 10⁻⁶; ReLU passes 1 through for z &gt; 0.
          </div>
          <ul class="activations-notes">
            <li>Step = the perceptron's threshold: slope 0 everywhere, so gradient descent gets no signal; a single perceptron cannot learn XOR, a multi-layer net can.</li>
            <li>Softmax generalises the sigmoid to K classes: pₖ = exp(sₖ) / Σⱼ exp(sⱼ), outputs in [0, 1] summing to 1.</li>
            <li>Output layers follow the task: sigmoid for binary or multilabel, softmax for multiclass, none for regression.</li>
          </ul>
        </div>
      </div>
    </WidgetFrame>
  );
}
