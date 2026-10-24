// Why voting helps, and when it doesn't: majority vote of n voters right with probability p (W7 s4-6, FAQ2).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Slider, Btn, Fb, Readout, Plot } from '../ui.jsx';
import { fmt, fix, pct, linePath, clamp } from '../lib/svg.js';
import { majorityAcc, binomAtLeast, oddCurve, cases3, N_STEPS } from './ensemble-accuracy-math.js';
import { useBoxWidth } from './w7-shared.js';

const L10 = Math.log10;
const XT = [1, 3, 10, 30, 100, 300, 1000];

const PRESETS = [
  { key: 'faq2', label: 'FAQ2: 3 × 60%', p: 0.6, n: 3, rho: 0 },
  { key: 'slide', label: 'Slide: 1000 × 51%', p: 0.51, n: 1001, rho: 0 },
  { key: 'same', label: 'Identical models', p: 0.6, n: 101, rho: 1 },
  { key: 'worse', label: 'Worse than chance', p: 0.45, n: 101, rho: 0 },
];

// the slide's numbers, recomputed exactly
const S3 = majorityAcc(3, 0.6);
const S1000 = majorityAcc(1000, 0.51); // strict majority: 501 or more of 1000 right
const S1000_TIE = binomAtLeast(1000, 500, 0.51); // also counts a 500-500 tie as a win
const S1001 = majorityAcc(1001, 0.51);

const css = `
.ensemble-accuracy-line { fill: none; stroke: var(--biro); stroke-width: 2.5; stroke-linejoin: round; }
.ensemble-accuracy-ind { fill: none; stroke: var(--ink-3); stroke-width: 1.5; stroke-dasharray: 5 4; }
.ensemble-accuracy-ref { stroke: var(--marker); stroke-width: 1.5; stroke-dasharray: 2 3; }
.ensemble-accuracy-now { stroke: var(--rule-2); stroke-width: 1; }
.ensemble-accuracy-dot { fill: var(--paper); stroke: var(--biro); stroke-width: 2.5; }
svg.plot.ensemble-accuracy-plot { touch-action: auto; }
svg.plot .ensemble-accuracy-reftext { fill: var(--marker); font-size: 11px; font-weight: 700; }
svg.plot .ensemble-accuracy-indtext { fill: var(--ink-3); font-size: 11px; }
.ensemble-accuracy-lower { display: grid; gap: 14px; align-items: start; }
@media (min-width: 760px) { .ensemble-accuracy-lower { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.ensemble-accuracy-faq > summary { cursor: pointer; font-weight: 700; font-size: 13.5px; color: var(--ink-2); margin-bottom: 6px; }
.ensemble-accuracy-faq table.mini td, .ensemble-accuracy-faq table.mini th { padding: 2px 6px; font-size: 13px; }
.ensemble-accuracy-faq td.pat { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; }
.ensemble-accuracy-faq tfoot td { border-top: 2px solid var(--rule-2); font-weight: 700; }
.ensemble-accuracy-check table.mini { width: 100%; }
.ensemble-accuracy-check table.mini td { font-size: 13px; text-align: left; vertical-align: top; }
`;

export default function EnsembleAccuracy() {
  const [p, setP] = useState(0.6);
  const [ni, setNi] = useState(1);
  const [rho, setRho] = useState(0);
  const n = N_STEPS[ni];
  const curve = useMemo(() => oddCurve(p), [p]);
  const indep = majorityAcc(n, p);
  const acc = rho * p + (1 - rho) * indep;
  const gain = acc - p;
  const cases = cases3(p);
  const sumCorrect = cases.filter((c) => c.correct).reduce((s, c) => s + c.prob, 0);
  const [ref, w] = useBoxWidth(440);
  const h = Math.round(clamp(w * 0.64, 240, 330));
  const kMin = Math.floor(n / 2) + 1;

  const load = (q) => {
    setP(q.p);
    setNi(N_STEPS.indexOf(q.n));
    setRho(q.rho);
  };

  let note;
  if (p < 0.5) note = <Fb kind="bad">Each voter is worse than chance, so the majority is wrong more often than one voter: adding voters makes it worse.</Fb>;
  else if (p === 0.5) note = <Fb kind="info">Coin-flip voters: the majority of coin flips is still a coin flip (50%).</Fb>;
  else if (rho === 1)
    note = (
      <Fb kind="hint">
        ρ = 1: every voter copies the same vote, so the ensemble is just one model and stays at {pct(p, 0)} whatever n is. Identical models
        gain nothing.
      </Fb>
    );
  else if (rho > 0)
    note = (
      <Fb kind="hint">
        Correlated errors cap the gain: even infinitely many voters only reach ρ·p + (1 − ρ) = {pct(rho * p + 1 - rho, 1)}.
      </Fb>
    );
  else note = <Fb kind="good">Independent voters that beat chance: the majority is right more often than any one of them, heading for 100% as n grows.</Fb>;

  return (
    <WidgetFrame
      title="Why voting helps (and when it doesn't)"
      lead="Set each voter's accuracy p, the number of voters n and how correlated they are; the curve is the accuracy of the majority vote."
      actions={PRESETS.map((q) => (
        <Btn size="sm" key={q.key} onClick={() => load(q)}>
          {q.label}
        </Btn>
      ))}
      foot={
        <span>
          Voting only helps when each voter beats chance (p &gt; 0.5) and their errors are independent: three independent 60% voters give
          64.8%. Diversity is the point: identical (perfectly correlated) models gain nothing, and with p &lt; 0.5 more voters make the
          ensemble worse.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="Each voter's accuracy p" value={p} min={0.4} max={0.8} step={0.01} onInput={setP} format={(v) => pct(v, 0)} />
          <Slider
            label="Number of voters n"
            value={ni}
            min={0}
            max={N_STEPS.length - 1}
            step={1}
            onInput={setNi}
            format={(i) => String(N_STEPS[i])}
            hint="Odd, so the vote can't tie."
          />
          <Slider
            label="Correlation ρ"
            value={rho}
            min={0}
            max={1}
            step={0.05}
            onInput={setRho}
            format={(v) => fmt(v, 2)}
            hint="With probability ρ all voters copy one shared vote; otherwise they vote independently."
          />
          <div class="readouts">
            <Readout label="One voter" value={pct(p, 1)} />
            <Readout
              label={`Majority of ${n}`}
              value={pct(acc, 1)}
              sub={Math.abs(gain) < 0.0005 ? 'no gain' : `${gain > 0 ? '+' : '−'}${fmt(Math.abs(gain) * 100, 1)} points`}
              tone={gain > 0.0005 ? 'good' : gain < -0.0005 ? 'bad' : undefined}
            />
          </div>
        </div>
        <div class="wg-plot">
          <div ref={ref}>
            <Plot
              w={w}
              h={h}
              x={[0, L10(1001)]}
              y={[0, 1]}
              pad={{ l: 46, r: 14, t: 14, b: 38 }}
              xTicks={XT.map(L10)}
              yTicks={[0, 0.25, 0.5, 0.75, 1]}
              xFmt={(v) => fmt(Math.pow(10, v), 0)}
              yFmt={(v) => pct(v, 0)}
              xLabel="number of voters n (log scale)"
              yLabel="majority-vote accuracy"
              class="ensemble-accuracy-plot"
              label={`Majority-vote accuracy against number of voters for p = ${pct(p, 0)} and correlation ${fmt(rho, 2)}`}
            >
              {({ X, Y, w: W, pad }) => {
                const mix = curve.map(([m, a]) => [L10(m), rho * p + (1 - rho) * a]);
                const ind = curve.map(([m, a]) => [L10(m), a]);
                const cx = X(L10(n));
                const cy = Y(acc);
                const refBelow = p > 0.5;
                const endInd = ind[ind.length - 1][1];
                // place the "n = …" label beside the point where the curve doesn't run through it
                const txt = `n = ${n}: ${pct(acc, 1)}`;
                const labW = txt.length * 7 + 4;
                const yAt = (lx) => {
                  if (lx <= mix[0][0]) return mix[0][1];
                  for (let i = 1; i < mix.length; i++)
                    if (mix[i][0] >= lx) return mix[i - 1][1] + ((mix[i][1] - mix[i - 1][1]) * (lx - mix[i - 1][0])) / (mix[i][0] - mix[i - 1][0]);
                  return mix[mix.length - 1][1];
                };
                const spanY = (xa, xb) => {
                  const vs = [xa, (xa + xb) / 2, xb].map((px) => Y(yAt(X.invert(px))));
                  return [Math.min(...vs), Math.max(...vs)];
                };
                const refY = Y(p) + (refBelow ? 15 : -6);
                const indY = Y(endInd) + (endInd > 0.9 ? 14 : -6);
                const boxes = [
                  [pad.l, W - pad.r, Y(p) - 1, Y(p) + 1], // the dotted one-voter line
                  [W - pad.r - 100, W - pad.r, refY - 11, refY + 3],
                  ...(rho > 0 ? [[W - pad.r - 120, W - pad.r, indY - 11, indY + 3]] : []),
                ];
                const cands = [];
                for (const side of [1, -1]) {
                  const xa = side > 0 ? cx + 9 : cx - 9 - labW;
                  if (xa < pad.l + 2 || xa + labW > W - pad.r - 2) continue;
                  const [top, bot] = spanY(xa, xa + labW);
                  cands.push({ side, xa, y: Math.min(cy, top) - 8 }, { side, xa, y: Math.max(cy, bot) + 18 });
                }
                const clear = (c) => !boxes.some(([x0, x1, y0, y1]) => c.xa < x1 && c.xa + labW > x0 && c.y - 12 < y1 && c.y + 4 > y0);
                const ok = cands.filter((c) => c.y - 11 >= pad.t && c.y + 3 <= Y(0) - 2 && clear(c));
                const pick = ok[0] || { side: cx > (pad.l + W - pad.r) / 2 ? -1 : 1, y: clamp(cy - 11, pad.t + 12, Y(0) - 4) };
                const right = pick.side < 0;
                const labY = pick.y;
                return (
                  <g>
                    <line class="ensemble-accuracy-ref" x1={pad.l} x2={W - pad.r} y1={Y(p)} y2={Y(p)} />
                    <text class="ensemble-accuracy-reftext" x={W - pad.r - 4} y={Y(p) + (refBelow ? 15 : -6)} text-anchor="end">
                      one voter: {pct(p, 0)}
                    </text>
                    {rho > 0 && (
                      <g>
                        <path class="ensemble-accuracy-ind" d={linePath(ind, X, Y)} />
                        <text
                          class="ensemble-accuracy-indtext"
                          x={W - pad.r - 4}
                          y={Y(endInd) + (endInd > 0.9 ? 14 : -6)}
                          text-anchor="end"
                        >
                          independent (ρ = 0)
                        </text>
                      </g>
                    )}
                    <path class="ensemble-accuracy-line" d={linePath(mix, X, Y)} />
                    <line class="ensemble-accuracy-now" x1={cx} x2={cx} y1={pad.t} y2={Y(0)} />
                    <circle class="ensemble-accuracy-dot" cx={cx} cy={cy} r="5" />
                    <text class="lbl-strong" x={right ? cx - 9 : cx + 9} y={labY} text-anchor={right ? 'end' : 'start'}>
                      n = {n}: {pct(acc, 1)}
                    </text>
                  </g>
                );
              }}
            </Plot>
          </div>
          <div class="wg-legend">
            <span>
              <span class="sw" style={{ background: 'var(--biro)' }} />
              majority vote{rho > 0 ? ` (ρ = ${fmt(rho, 2)})` : ''}
            </span>
            {rho > 0 && (
              <span>
                <span class="sw" style={{ background: 'var(--ink-3)' }} />
                dashed: independent voters
              </span>
            )}
            <span>
              <span class="sw" style={{ background: 'var(--marker)' }} />
              dotted: one voter (p)
            </span>
          </div>
        </div>
      </div>
      <div class="calc-steps" aria-live="polite">
        <div>
          P(majority right) = Σ C({n},k)·{fmt(p, 2)}^k·{fmt(1 - p, 2)}^({n}−k) for k = {kMin}…{n} = {fix(indep, 4)}
        </div>
        {rho > 0 && (
          <div>
            with ρ = {fmt(rho, 2)}: {fmt(rho, 2)} × {fmt(p, 2)} + {fmt(1 - rho, 2)} × {fix(indep, 4)} = {fix(acc, 4)}
          </div>
        )}
        <div class="why">Binomial: count the ways at least {kMin} of the {n} voters are right.</div>
      </div>
      {note}
      <div class="ensemble-accuracy-lower">
        <details class="ensemble-accuracy-faq" open>
          <summary>FAQ2: all 8 cases for 3 voters at p = {pct(p, 0)}</summary>
          <div class="mini-wrap">
            <table class="mini" aria-label="Eight prediction cases for three voters">
              <thead>
                <tr>
                  <th>M1</th>
                  <th>M2</th>
                  <th>M3</th>
                  <th>P(case)</th>
                  <th>Majority</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.pat}>
                    {[...c.pat].map((x, i) => (
                      <td key={i} class="pat">
                        {x === 'c' ? 'c' : 'w'}/{fmt(x === 'c' ? p : 1 - p, 2)}
                      </td>
                    ))}
                    <td>{fix(c.prob, 3)}</td>
                    <td class={c.correct ? 'good' : 'bad'}>{c.correct ? '✓ right' : '✗ wrong'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} class="l">
                    Sum of ✓ rows
                  </td>
                  <td>{fix(sumCorrect, 3)}</td>
                  <td>{pct(sumCorrect, 1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="faint small" style={{ marginTop: '6px' }}>
            c = correct, w = wrong. {Math.abs(p - 0.6) < 1e-9 && 'The slide prints 0.144 for w c w; it is 0.4 × 0.6 × 0.4 = 0.096 (the eight cases must sum to 1). Its total, 0.648, is right.'}
          </div>
        </details>
        <div class="ensemble-accuracy-check stack-sm">
          <div class="mx-cap">Slide numbers, checked exactly</div>
          <table class="mini">
            <thead>
              <tr>
                <th class="l">Slide says</th>
                <th class="l">Exact binomial</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>3 voters × 60% → 64.8% (FAQ2)</td>
                <td class="good">{pct(S3, 1)} ✓</td>
              </tr>
              <tr>
                <td>1000 voters × 51% → “≈ 75%” (s6)</td>
                <td>
                  <b>{pct(S1000, 1)}</b> (501 or more right)
                </td>
              </tr>
            </tbody>
          </table>
          <div class="faint small">
            Same idea, rounded optimistically: the textbook's 75% is P(at least 500 right) = {pct(S1000_TIE, 1)}, which counts a 500–500
            tie as a win. With 1001 voters there are no ties: {pct(S1001, 1)}. It also assumes the 1000 voters are independent.
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
