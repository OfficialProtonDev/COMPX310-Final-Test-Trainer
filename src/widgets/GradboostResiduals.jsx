// Gradient boosting fits the residuals: small 1-D regression trees added one at a time (W7 s34-39).
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Seg, Slider, Btn, Fb, Readout, Plot } from '../ui.jsx';
import { fmt, fix, clamp, scale, ticks, svgPoint } from '../lib/svg.js';
import { makeData, boost, predictTree, thresholds, stepSegments } from './gradboost-residuals-math.js';
import { useBoxWidth } from './w7-shared.js';

// Seeded data like the slides' (x in [-0.5, 0.5], y = 3x² + noise σ 0.05). With η = 0.1, max_depth 2 and 120 trees the
// validation minimum of this seed is at 55 trees, as in the lecture (s38).
export const DATA_SEED = 353;
const DATA = makeData(DATA_SEED, 60, 40);
const X0 = -0.5;
const X1 = 0.5;
const YD = [-0.15, 0.85];
const XT = [-0.4, -0.2, 0, 0.2, 0.4];
const YT = [0, 0.2, 0.4, 0.6, 0.8];
const LR_TABLE = [1, 0.5, 0.2, 0.1, 0.05];
const NICE = [0.002, 0.003, 0.004, 0.005, 0.006, 0.008, 0.01, 0.012, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15];
const RES = [0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 0.8];

const PRESETS = [
  { key: 's35', label: 's35: first 3 trees, η = 1', n: 120, lr: 1, depth: 2, k: 3 },
  { key: 's38', label: 's37–38: η = 0.1, early stopping', n: 120, lr: 0.1, depth: 2, k: 'best' },
];

/** Symmetric ticks for the residual plot: about 5-7 lines whatever the range. */
function resTicks(R) {
  const step = R <= 0.15 ? 0.05 : R <= 0.3 ? 0.1 : R <= 0.6 ? 0.2 : 0.4;
  const out = [];
  for (let i = -Math.floor(R / step + 1e-9); i <= Math.floor(R / step + 1e-9); i++) out.push(+(i * step).toFixed(10));
  return out;
}

function stepPath(segs, X, Y) {
  let d = '';
  segs.forEach(([a, b, v], i) => {
    const y = Y(v).toFixed(2);
    d += (i ? `V${y}` : `M${X(a).toFixed(2)},${y}`) + `H${X(b).toFixed(2)}`;
  });
  return d;
}
const crosses = (pts, X, Y, s = 3.2) =>
  pts.map(([x, y]) => `M${(X(x) - s).toFixed(1)},${Y(y).toFixed(1)}h${2 * s}M${X(x).toFixed(1)},${(Y(y) - s).toFixed(1)}v${2 * s}`).join('');
const mse5 = (v) => fix(v, 5);

const css = `
.gradboost-residuals-ctl { display: grid; gap: 12px 18px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); align-items: end; }
.gradboost-residuals-stage { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.gradboost-residuals-stage .ctl { flex: 1 1 200px; min-width: 0; max-width: 340px; }
.gradboost-residuals-plots { display: grid; gap: 14px; }
@media (min-width: 700px) { .gradboost-residuals-plots { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.gradboost-residuals-cap { font-size: 13px; font-weight: 700; color: var(--ink-2); }
.gradboost-residuals-cap .math { font-family: var(--font-math); font-size: 15px; font-weight: 400; color: var(--ink); }
svg.plot.gradboost-residuals-view { touch-action: auto; }
svg.plot.gradboost-residuals-mse { touch-action: pan-y; cursor: crosshair; }
.gradboost-residuals-pt { fill: var(--c1); }
.gradboost-residuals-cross { stroke: var(--ink-2); stroke-width: 1.4; fill: none; }
.gradboost-residuals-tree { fill: none; stroke: var(--c3); stroke-width: 2.6; stroke-linejoin: round; }
.gradboost-residuals-shrunk { fill: none; stroke: var(--c3); stroke-width: 1.6; stroke-dasharray: 5 4; }
.gradboost-residuals-ens { fill: none; stroke: var(--c2); stroke-width: 2.6; stroke-linejoin: round; }
.gradboost-residuals-zero { stroke: var(--axis); stroke-width: 1; }
.gradboost-residuals-train { fill: none; stroke: var(--c1); stroke-width: 2; stroke-dasharray: 6 3; }
.gradboost-residuals-val { fill: none; stroke: var(--c2); stroke-width: 2.4; }
.gradboost-residuals-now { stroke: var(--ink-2); stroke-width: 1.2; }
.gradboost-residuals-drop { stroke: var(--ink-3); stroke-width: 1; stroke-dasharray: 3 3; }
.gradboost-residuals-lrt { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; color: var(--ink-2); }
.gradboost-residuals-lrt .chip { font-family: var(--font-mono); font-stretch: 87.5%; }
`;

export default function GradboostResiduals() {
  const [nTrees, setNTrees] = useState(120);
  const [lr, setLr] = useState(1);
  const [depth, setDepth] = useState(2);
  const [kRaw, setK] = useState(3);
  const uid = useId();
  const fit = useMemo(() => boost(DATA.train, DATA.val, nTrees, lr, depth), [nTrees, lr, depth]);
  const bestByLr = useMemo(() => LR_TABLE.map((a) => [a, boost(DATA.train, DATA.val, 120, a, depth).best]), [depth]);
  const k = clamp(kRaw, 1, nTrees);
  const tree = fit.trees[k - 1];
  const resid = fit.resid[k - 1];

  const [refA, wA] = useBoxWidth(400);
  const [refB, wB] = useBoxWidth(400);
  const [refC, wC] = useBoxWidth(700);
  const hA = Math.round(clamp(wA * 0.72, 220, 320));
  const hC = Math.round(clamp(wC * 0.42, 210, 280));

  const ens = useMemo(() => {
    const ts = fit.trees.slice(0, k);
    const breaks = ts.flatMap((t) => thresholds(t));
    return stepSegments((x) => lr * ts.reduce((s, t) => s + predictTree(t, x), 0), breaks, X0, X1);
  }, [fit, k, lr]);
  const hSegs = useMemo(() => stepSegments((x) => predictTree(tree, x), thresholds(tree), X0, X1), [tree]);

  const resPts = DATA.train.map((p, i) => [p[0], resid[i]]);
  const maxR = Math.max(...resid.map(Math.abs), ...hSegs.map((s) => Math.abs(s[2])));
  const R = RES.find((v) => v >= maxR * 1.08) || 0.8;
  const leftY = k === 1 ? YD : [-R, R];

  const minVal = fit.valMse[fit.best - 1];
  const yMax = NICE.find((v) => v >= Math.min(Math.max(...fit.valMse, ...fit.trainMse), 3.5 * minVal)) || 0.15;
  const nX = Math.max(2, nTrees);
  const padC = { l: 52, r: 14, t: 14, b: 36 };
  const XC = scale(1, nX, padC.l, wC - padC.r);
  const setFromPointer = (e) => {
    const svg = e.currentTarget;
    const { x } = svgPoint(svg, e);
    setK(clamp(Math.round(XC.invert(x)), 1, nTrees));
  };

  const load = (q) => {
    setNTrees(q.n);
    setLr(q.lr);
    setDepth(q.depth);
    setK(q.k === 'best' ? boost(DATA.train, DATA.val, q.n, q.lr, q.depth).best : q.k);
  };

  const eta = fmt(lr, 2);
  let fb;
  if (k === fit.best)
    fb = (
      <Fb kind="good">
        This is the validation minimum: early stopping keeps {fit.best} tree{fit.best > 1 ? 's' : ''} (<code>np.argmin(errors) + 1</code>, then
        retrain with <code>n_estimators={fit.best}</code>).
      </Fb>
    );
  else if (k > fit.best)
    fb = (
      <Fb kind="hint">
        Past the validation minimum ({fit.best} trees): training error keeps falling but validation error is{' '}
        {fix(((fit.valMse[k - 1] - minVal) / minVal) * 100, 0)}% higher. The extra trees are fitting noise (overfitting).
      </Fb>
    );
  else
    fb = (
      <Fb kind="info">
        Still improving: validation error keeps falling until {fit.best} trees. Press Next or click the error plot to move through the
        stages.
      </Fb>
    );

  return (
    <WidgetFrame
      title="Gradient boosting fits the residuals"
      lead="Each tree is fit to what the trees before it got wrong. Step through the stages, then change the learning rate and watch where validation error bottoms out."
      actions={PRESETS.map((q) => (
        <Btn size="sm" key={q.key} onClick={() => load(q)}>
          {q.label}
        </Btn>
      ))}
      foot={
        <span>
          Each new tree is fit to the residuals y − (prediction so far), and the prediction is η × the sum of all trees. A lower learning
          rate (shrinkage) needs more trees; too many trees overfit, so pick the number with early stopping on a validation set
          (<code>staged_predict</code> + argmin; the lecture's best was 55 of 120 trees).
        </span>
      }
    >
      <style>{css}</style>
      <div class="gradboost-residuals-ctl">
        <Slider
          label="Trees trained (n_estimators)"
          value={nTrees}
          min={1}
          max={120}
          step={1}
          onInput={(v) => {
            setNTrees(v);
            setK((old) => Math.min(old, v));
          }}
          format={(v) => String(v)}
        />
        <Slider label="Learning rate η" value={lr} min={0.05} max={1} step={0.05} onInput={setLr} format={(v) => fmt(v, 2)} />
        <div class="ctl">
          <div class="ctl-top">
            <span class="ctl-label">max_depth of each tree</span>
          </div>
          <Seg
            label="max_depth"
            value={depth}
            onChange={setDepth}
            options={[
              { value: 1, label: '1 (stump)' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
            ]}
          />
        </div>
      </div>
      <div class="gradboost-residuals-stage">
        <Btn size="sm" onClick={() => setK(k - 1)} disabled={k <= 1} aria-label="Previous stage">
          ◀ Prev
        </Btn>
        <Btn size="sm" kind="primary" onClick={() => setK(k + 1)} disabled={k >= nTrees} aria-label="Next stage">
          Next ▶
        </Btn>
        <Slider label="Stage k (trees so far)" value={k} min={1} max={nTrees} step={1} onInput={setK} format={(v) => `${v} of ${nTrees}`} />
        <Btn size="sm" kind="ghost" onClick={() => setK(fit.best)} disabled={k === fit.best}>
          Go to best ({fit.best})
        </Btn>
      </div>
      <div class="gradboost-residuals-plots">
        <div class="wg-plot">
          <div class="gradboost-residuals-cap">
            {k === 1 ? (
              <span>
                Tree <span class="math">h₁</span> fit to <span class="math">y</span>
              </span>
            ) : (
              <span>
                Residuals <span class="math">y − F{toSub(k - 1)}</span> and tree <span class="math">h{toSub(k)}</span> fit to them
              </span>
            )}
          </div>
          <div ref={refA}>
            <Plot
              w={wA}
              h={hA}
              x={[X0, X1]}
              y={leftY}
              pad={{ l: 44, r: 12, t: 12, b: 34 }}
              xTicks={XT}
              yTicks={k === 1 ? YT : resTicks(R)}
              xLabel="x₁"
              yFmt={(v) => fmt(v, 2)}
              class="gradboost-residuals-view"
              label={`Stage ${k}: residuals and the tree fit to them`}
            >
              {({ X, Y, w: W, pad }) => (
                <g>
                  {k > 1 && <line class="gradboost-residuals-zero" x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} />}
                  {k === 1 ? (
                    DATA.train.map(([x, y], i) => <circle key={i} class="gradboost-residuals-pt" cx={X(x)} cy={Y(y)} r="2.6" />)
                  ) : (
                    <path class="gradboost-residuals-cross" d={crosses(resPts, X, Y)} />
                  )}
                  {lr < 1 && <path class="gradboost-residuals-shrunk" d={stepPath(hSegs.map(([a, b, v]) => [a, b, lr * v]), X, Y)} />}
                  <path class="gradboost-residuals-tree" d={stepPath(hSegs, X, Y)} />
                </g>
              )}
            </Plot>
          </div>
          <div class="wg-legend">
            <span>{k === 1 ? '● training points y' : '+ residuals (what is still wrong)'}</span>
            <span>
              <span class="sw" style={{ background: 'var(--c3)' }} />
              tree h{toSub(k)} (max_depth {depth})
            </span>
            {lr < 1 && <span>dashed: η·h{toSub(k)}, the part actually added</span>}
          </div>
        </div>
        <div class="wg-plot">
          <div class="gradboost-residuals-cap">
            Ensemble{' '}
            <span class="math">
              F{toSub(k)} = {lr === 1 || k === 1 ? '' : eta + '·('}
              {lr !== 1 && k === 1 ? eta + '·' : ''}
              {k <= 3 ? Array.from({ length: k }, (_, i) => 'h' + toSub(i + 1)).join(' + ') : `h₁ + … + h${toSub(k)}`}
              {lr === 1 || k === 1 ? '' : ')'}
            </span>
          </div>
          <div ref={refB}>
            <Plot
              w={wB}
              h={hA}
              x={[X0, X1]}
              y={YD}
              pad={{ l: 44, r: 12, t: 12, b: 34 }}
              xTicks={XT}
              yTicks={YT}
              xLabel="x₁"
              yFmt={(v) => fmt(v, 2)}
              class="gradboost-residuals-view"
              label={`Ensemble prediction after ${k} trees`}
            >
              {({ X, Y }) => (
                <g>
                  {DATA.train.map(([x, y], i) => (
                    <circle key={i} class="gradboost-residuals-pt" cx={X(x)} cy={Y(y)} r="2.6" />
                  ))}
                  <path class="gradboost-residuals-ens" d={stepPath(ens, X, Y)} />
                </g>
              )}
            </Plot>
          </div>
          <div class="wg-legend">
            <span>● training data (60 points)</span>
            <span>
              <span class="sw" style={{ background: 'var(--c2)' }} />
              prediction after {k} tree{k > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
      <div class="wg-plot">
        <div class="gradboost-residuals-cap">
          Error against number of trees (staged_predict on the training and validation sets; click to pick a stage)
        </div>
        <div ref={refC}>
          <Plot
            w={wC}
            h={hC}
            x={[1, nX]}
            y={[0, yMax]}
            pad={padC}
            yTicks={ticks(0, yMax, 4)}
            xLabel="number of trees"
            yLabel="MSE"
            yFmt={(v) => fmt(v, 3)}
            xFmt={(v) => fmt(v, 0)}
            class="gradboost-residuals-mse"
            label={`Training and validation MSE for 1 to ${nTrees} trees; validation minimum at ${fit.best}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
              setFromPointer(e);
            }}
            onPointerMove={(e) => e.buttons && setFromPointer(e)}
          >
            {({ X, Y, w: W, h: H, pad }) => {
              const cid = `gbr-clip-${uid}`;
              const line = (arr) =>
                arr.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)},${Y(v).toFixed(1)}`).join('');
              const bx = X(fit.best);
              const by = Y(minVal);
              // put the "minimum" label where neither curve runs through it: below the point if the training curve
              // leaves room under it, otherwise above the validation curve
              const txt = `minimum: ${fit.best} tree${fit.best > 1 ? 's' : ''}`;
              const labW = txt.length * 7 + 4;
              const labRight = bx + 8 + labW <= W - pad.r;
              const x0 = labRight ? bx + 8 : bx - 8 - labW;
              const kA = clamp(Math.floor(X.invert(x0)), 1, nTrees);
              const kB = clamp(Math.ceil(X.invert(x0 + labW)), 1, nTrees);
              let trainTop = Infinity;
              let valTop = Infinity;
              for (let q = kA; q <= kB; q++) {
                trainTop = Math.min(trainTop, Y(Math.min(fit.trainMse[q - 1], yMax)));
                valTop = Math.min(valTop, Y(Math.min(fit.valMse[q - 1], yMax)));
              }
              const belowY = by + 17;
              const labY = belowY + 3 <= trainTop && belowY <= H - pad.b - 4 ? belowY : Math.max(pad.t + 12, Math.min(by, valTop) - 8);
              return (
                <g>
                  <defs>
                    <clipPath id={cid}>
                      <rect x={pad.l} y={pad.t - 2} width={W - pad.l - pad.r} height={H - pad.t - pad.b + 2} />
                    </clipPath>
                  </defs>
                  <g clip-path={`url(#${cid})`}>
                    <path class="gradboost-residuals-train" d={line(fit.trainMse)} />
                    <path class="gradboost-residuals-val" d={line(fit.valMse)} />
                  </g>
                  <line class="gradboost-residuals-drop" x1={bx} x2={bx} y1={by} y2={H - pad.b} />
                  <line class="gradboost-residuals-drop" x1={pad.l} x2={bx} y1={by} y2={by} />
                  <circle cx={bx} cy={by} r="5" fill="var(--c2)" stroke="var(--paper)" stroke-width="1.5" />
                  <text class="lbl-strong" x={labRight ? bx + 8 : bx - 8} y={labY} text-anchor={labRight ? 'start' : 'end'}>
                    {txt}
                  </text>
                  <line class="gradboost-residuals-now" x1={X(k)} x2={X(k)} y1={pad.t} y2={H - pad.b} />
                  {fit.valMse[k - 1] <= yMax && <circle cx={X(k)} cy={Y(fit.valMse[k - 1])} r="3.5" fill="var(--c2)" />}
                  {fit.trainMse[k - 1] <= yMax && <circle cx={X(k)} cy={Y(fit.trainMse[k - 1])} r="3.5" fill="var(--c1)" />}
                </g>
              );
            }}
          </Plot>
        </div>
        <div class="wg-legend">
          <span>
            <span class="sw" style={{ background: 'var(--c2)' }} />
            validation MSE (solid)
          </span>
          <span>
            <span class="sw" style={{ background: 'var(--c1)' }} />
            training MSE (dashed)
          </span>
          <span>vertical line: stage {k}</span>
        </div>
      </div>
      <div class="readouts" aria-live="polite">
        <Readout label="Stage" value={`${k} tree${k > 1 ? 's' : ''}`} sub={`η = ${eta}, max_depth ${depth}`} />
        <Readout label="Training MSE" value={mse5(fit.trainMse[k - 1])} />
        <Readout label="Validation MSE" value={mse5(fit.valMse[k - 1])} />
        <Readout label="Best (early stopping)" value={`${fit.best} trees`} sub={`val MSE ${mse5(minVal)}`} tone="good" />
      </div>
      {fb}
      <div class="gradboost-residuals-lrt">
        <span>Best number of trees (validation minimum, 120 trained, max_depth {depth}) by learning rate:</span>
        {bestByLr.map(([a, b]) => (
          <span key={a} class={`chip ${Math.abs(a - lr) < 1e-9 ? 'blue' : ''}`}>
            η {fmt(a, 2)} → {b}
          </span>
        ))}
      </div>
    </WidgetFrame>
  );
}

function toSub(n) {
  return String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);
}
