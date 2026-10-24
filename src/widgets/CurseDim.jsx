// Curse of dimensionality: near-border chance and mean distance in the unit hypercube (W10a s5-6).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Readout } from '../ui.jsx';
import { fmt, linePath, linspace } from '../lib/svg.js';
import { nearBorder, log10NotNear, avgDistance, EXACT_MEAN } from './curse-dim-math.js';
import { useWidth } from './c-helpers.jsx';

const css = `
.curse-dim-plots { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.curse-dim-cap { font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 4px; }
.curse-dim-ro { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.curse-dim-ro .readout-v sup { font-size: 0.62em; }
`;

const XL = ['1', '10', '100', '1k', '10k', '100k', '1M'];
const JUMPS = [2, 3, 100, 10000, 1000000];
const fmtInt = (d) => d.toLocaleString('en-US');

function nearText(d) {
  const lq = log10NotNear(d);
  if (lq < -12) return { v: '≈ 100%', s: <span>a point not near a border: 1 in 10<sup>{fmtInt(Math.round(-lq))}</sup></span> };
  const p = nearBorder(d);
  if (p >= 0.99) {
    const dec = Math.min(12, Math.max(1, Math.ceil(-Math.log10((1 - p) * 100)) + 1));
    return { v: fmt(p * 100, dec) + '%', s: <span>1 − 0.998<sup>{fmtInt(d)}</sup></span> };
  }
  return { v: fmt(p * 100, p < 0.1 ? 2 : 1) + '%', s: <span>1 − 0.998<sup>{fmtInt(d)}</sup></span> };
}

const METHOD = { exact: 'exact value', mc: 'Monte-Carlo, 3,000 random pairs', approx: '≈ √(d/6) for large d' };

function MiniPlot({ title, children, ...p }) {
  const [ref, w] = useWidth(320);
  return (
    <div ref={ref} style={{ minWidth: 0 }}>
      <div class="curse-dim-cap">{title}</div>
      <Plot w={w} h={210} pad={{ l: 46, r: 14, t: 12, b: 36 }} {...p}>
        {children}
      </Plot>
    </div>
  );
}

export default function CurseDim() {
  const [d, setD] = useState(2);
  const near = nearText(d);
  const dist = useMemo(() => avgDistance(d), [d]);

  // curves on a log-x grid (exact values for d ≤ 3, the large-d formula elsewhere; the MC estimate sits on it)
  const curves = useMemo(() => {
    const xs = linspace(0, 6, 241);
    const meanAt = (dd) => (dd <= 3 && Number.isInteger(dd) ? EXACT_MEAN[dd] : Math.sqrt(dd / 6) * (1 - 0.175 / dd));
    return {
      near: xs.map((x) => [x, nearBorder(10 ** x)]),
      dist: xs.map((x) => [x, Math.log10(meanAt(10 ** x))]),
    };
  }, []);
  const lx = Math.log10(d);

  return (
    <WidgetFrame
      title="Curse of dimensionality"
      lead="Slide d from 1 up to 1,000,000 (log scale) and compare with the slide's numbers: 0.4% and 0.52 at d = 2, 408.25 at d = 1,000,000."
      foot={
        <span>
          High-dimensional space is sparse: almost every point sits near a border and two random points are about √(d/6) apart, so
          training instances are far from each other and overfitting is very likely. More data can't realistically fix it (≈10
          <sup>d</sup> points for 0.1 spacing), so reduce the dimensions instead.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <Slider
            label="Dimensions d (log scale)"
            value={Math.log10(d)}
            min={0}
            max={6}
            step={0.01}
            onInput={(v) => setD(Math.max(1, Math.round(10 ** v)))}
            format={() => fmtInt(d)}
          />
        </div>
        <Seg
          label="Jump to a slide value"
          value={d}
          onChange={setD}
          options={JUMPS.map((j) => ({ value: j, label: j >= 1000 ? XL[Math.log10(j)] : String(j), title: `d = ${fmtInt(j)}` }))}
        />
      </div>
      <div class="curse-dim-ro" aria-live="polite">
        <Readout label="Within 0.001 of a border" value={near.v} sub={near.s} tone={nearBorder(d) > 0.5 ? 'bad' : undefined} />
        <Readout
          label="Mean distance, 2 random points"
          value={`${fmt(dist.mean, 2)} ± ${fmt(dist.sd, 3)}`}
          sub={`${METHOD[dist.method]}; the cube is only 1 wide`}
          tone={dist.mean > 1 ? 'bad' : undefined}
        />
        <Readout
          label="Points for 0.1 spacing"
          value={
            <span>
              10<sup>{fmtInt(d)}</sup>
            </span>
          }
          sub={d >= 80 ? 'more than the ~10⁸⁰ atoms in the universe' : 'one per 0.1-wide cell: (1/0.1)^d'}
          tone={d >= 80 ? 'bad' : undefined}
        />
      </div>
      <div class="curse-dim-plots">
        <MiniPlot
          title="Chance of being near a border"
          x={[0, 6]}
          y={[0, 1]}
          xTicks={[0, 1, 2, 3, 4, 5, 6]}
          yTicks={[0, 0.25, 0.5, 0.75, 1]}
          xFmt={(v) => XL[v]}
          yFmt={(v) => fmt(v * 100) + '%'}
          xLabel="dimensions d"
          label="Chance a random point is within 0.001 of a border, against d"
        >
          {({ X, Y, h, pad }) => (
            <g>
              <path d={linePath(curves.near, X, Y)} fill="none" stroke="var(--biro)" stroke-width="2.5" />
              <line x1={X(lx)} x2={X(lx)} y1={pad.t} y2={h - pad.b} stroke="var(--marker)" stroke-dasharray="4 3" />
              <circle cx={X(lx)} cy={Y(nearBorder(d))} r="5" fill="var(--marker)" stroke="var(--paper)" stroke-width="1.5" />
            </g>
          )}
        </MiniPlot>
        <MiniPlot
          title="Mean distance (log scale)"
          x={[0, 6]}
          y={[-1, 3]}
          xTicks={[0, 1, 2, 3, 4, 5, 6]}
          yTicks={[-1, 0, 1, 2, 3]}
          xFmt={(v) => XL[v]}
          yFmt={(v) => fmt(10 ** v)}
          xLabel="dimensions d"
          label="Mean distance between two random points, against d, log-log"
        >
          {({ X, Y, w, h, pad }) => (
            <g>
              <line x1={pad.l} x2={w - pad.r} y1={Y(0)} y2={Y(0)} stroke="var(--ink-3)" stroke-dasharray="2 3" />
              <text class="lbl" x={w - pad.r - 4} y={Y(0) + 14} text-anchor="end">
                cube side = 1
              </text>
              <path d={linePath(curves.dist, X, Y)} fill="none" stroke="var(--biro)" stroke-width="2.5" />
              <line x1={X(lx)} x2={X(lx)} y1={pad.t} y2={h - pad.b} stroke="var(--marker)" stroke-dasharray="4 3" />
              <circle cx={X(lx)} cy={Y(Math.log10(dist.mean))} r="5" fill="var(--marker)" stroke="var(--paper)" stroke-width="1.5" />
            </g>
          )}
        </MiniPlot>
      </div>
    </WidgetFrame>
  );
}
