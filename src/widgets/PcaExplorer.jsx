// PCA on a 2-D cloud: projections, captured variance vs direction, PC1/PC2, lossy reconstruction,
// and choosing the number of components from explained_variance_ratio_ (W10a s9-13).
import { useState, useMemo, useRef, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Btn, Readout, Fb } from '../ui.jsx';
import { fmt, scale, svgPoint, linePath, linspace } from '../lib/svg.js';
import { makeCloud, cov2, pca2, varAlong, project, RATIOS12, cumsum, chooseD, elbow } from './pca-explorer-math.js';
import { useWidth, equalDomain, Check } from './c-helpers.jsx';

const css = `
.pca-explorer-sec { font-family: var(--font-display); font-size: 13px; font-weight: 700; letter-spacing: 0.02em; color: var(--ink-2); margin: 4px 0 -4px; }
.pca-explorer-strip-cap { font-size: 12.5px; color: var(--ink-3); }
.pca-explorer-hr { border: 0; border-top: 1px dashed var(--rule-2); margin: 4px 0; width: 100%; }
.pca-explorer-code { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; line-height: 1.6; background: var(--paper-2); border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 8px 10px; overflow-x: auto; white-space: pre; color: var(--ink); }
.pca-explorer-cm { color: var(--ink-3); }
.pca-explorer-plot { cursor: crosshair; }
`;

const rad = (d) => (d * Math.PI) / 180;
const norm180 = (a) => ((a % 180) + 180) % 180;

function Arrow({ x1, y1, x2, y2, color, width = 3, head = 9 }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - head * Math.cos(a);
  const hy = y2 - head * Math.sin(a);
  const p = (t) => `${(hx + (head * 0.55) * Math.cos(a + t)).toFixed(1)},${(hy + (head * 0.55) * Math.sin(a + t)).toFixed(1)}`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} stroke-width={width} stroke-linecap="round" />
      <path d={`M${x2.toFixed(1)},${y2.toFixed(1)}L${p(Math.PI / 2)}L${p(-Math.PI / 2)}Z`} fill={color} />
    </g>
  );
}

export default function PcaExplorer() {
  const pts = useMemo(() => makeCloud(120, 27), []);
  const C = useMemo(() => cov2(pts), [pts]);
  const E = useMemo(() => pca2(C), [C]);
  const total = C.sxx + C.syy;
  const [deg, setDeg] = useState(0);
  const [showPC, setShowPC] = useState(false);
  const [compress, setCompress] = useState(false);
  const [t, setT] = useState(0.95);

  const captured = varAlong(C, deg) / total;
  const atPC1 = Math.abs(((deg - E.deg + 90) % 180 + 180) % 180 - 90) < 0.5;
  const proj = useMemo(() => project(pts, C, deg), [pts, C, deg]);
  const recon = useMemo(() => project(pts, C, E.deg), [pts, C, E.deg]);

  // main scatter: 1 data unit = same pixels on both axes so right angles look right
  const [ref, w] = useWidth(380);
  const h = Math.round(Math.max(230, Math.min(330, w * 0.64)));
  const pad = { l: 34, r: 10, t: 10, b: 28 };
  const [xd, yd] = equalDomain([-1.3, 1.3], [-1.25, 1.25], w - pad.l - pad.r, h - pad.t - pad.b);
  const Xs = scale(xd[0], xd[1], pad.l, w - pad.r);
  const Ys = scale(yd[0], yd[1], h - pad.b, pad.t);
  const svgRef = useRef(null);
  const drag = useRef(false);
  const fromEvt = (e) => {
    const p = svgPoint(svgRef.current, e);
    const dx = Xs.invert(p.x) - C.mx;
    const dy = Ys.invert(p.y) - C.my;
    if (Math.hypot(dx, dy) < 0.06) return;
    const a = norm180((Math.atan2(dy, dx) * 180) / Math.PI);
    setDeg(a >= 179.5 ? 0 : a); // 180° is the same line as 0°
  };

  const ux = Math.cos(rad(deg));
  const uy = Math.sin(rad(deg));
  const u1 = [Math.cos(rad(E.deg)), Math.sin(rad(E.deg))];
  const u2 = [-u1[1], u1[0]];
  const L = 4; // half-length of the drawn direction line (data units; clipped by the plot)
  const hx = C.mx + 1.12 * ux;
  const hy = C.my + 1.12 * uy;

  // variance vs angle curve
  const curve = useMemo(() => linspace(0, 180, 181).map((a) => [a, (100 * varAlong(C, a)) / total]), [C, total]);
  const [ref2, w2] = useWidth(380);
  const clipId = 'pca-explorer-clip-' + useId();

  // number-of-components panel
  const cs = useMemo(() => cumsum(RATIOS12), []);
  const dSel = chooseD(RATIOS12, t);
  const elb = useMemo(() => elbow(RATIOS12), []);
  const [ref4, w4] = useWidth(380);

  const zS = scale(-1.6, 1.6, 14, Math.max(60, w) - 14);

  return (
    <WidgetFrame
      title="PCA finds the axes of most variance"
      lead="Turn the line (slider, or drag on the plot) and watch how much of the spread the projected points keep; then snap to PC1."
      foot={
        <span>
          PCA finds orthogonal directions of maximum variance: PC1 keeps the most, PC2 is at a right angle and keeps the rest. Keep enough
          components for about 95% of the variance (<code>PCA(n_components=0.95)</code>); <code>inverse_transform</code> gives back only an
          approximation (lossy). PCA is linear, so it can't unroll curved manifolds such as a swiss roll.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="Direction of the line" value={deg} min={0} max={179} step={1} onInput={setDeg} format={(v) => fmt(v, 0) + '°'} />
          <div class="wg-row">
            <Btn size="sm" kind="primary" class="pca-explorer-snap" onClick={() => setDeg(E.deg)}>
              Snap to PC1
            </Btn>
            <Btn size="sm" onClick={() => setDeg(norm180(E.deg + 90))}>
              Snap to PC2
            </Btn>
          </div>
          <Check checked={showPC} onChange={setShowPC}>
            Show PC1 &amp; PC2 arrows
          </Check>
          <Check checked={compress} onChange={setCompress}>
            Compress to 1-D and back
          </Check>
          <div class="readouts" aria-live="polite">
            <Readout
              label="Variance kept"
              value={fmt(captured * 100, 1) + '%'}
              sub={atPC1 ? 'maximum: this is PC1' : `of the total; PC1 keeps ${fmt(E.ratio[0] * 100, 1)}%`}
              tone={atPC1 ? 'good' : undefined}
            />
          </div>
          <div class="pca-explorer-code" aria-label="explained variance ratio">
            <span class="pca-explorer-cm"># from these 120 points</span>
            {'\n'}pca.explained_variance_ratio_{'\n'}
            {`→ [${fmt(E.ratio[0], 2)}, ${fmt(E.ratio[1], 2)}]`}
          </div>
          {compress && (
            <Fb kind="info">
              Each point is replaced by its spot on PC1 (<code>transform</code> then <code>inverse_transform</code>): {fmt(E.ratio[0] * 100, 0)}% of
              the variance survives, the {fmt(E.ratio[1] * 100, 0)}% along PC2 is lost.
            </Fb>
          )}
        </div>
        <div class="wg-plot">
          <div ref={ref} style={{ minWidth: 0 }}>
            <Plot
              w={w}
              h={h}
              x={xd}
              y={yd}
              pad={pad}
              yTicks={[-1, 0, 1]}
              xLabel="x₁"
              yLabel="x₂"
              svgRef={svgRef}
              class="pca-explorer-plot"
              label={`Scatter of 120 points with a line at ${fmt(deg, 0)} degrees`}
              onPointerDown={(e) => {
                drag.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                fromEvt(e);
              }}
              onPointerMove={(e) => drag.current && fromEvt(e)}
              onPointerUp={() => (drag.current = false)}
            >
              {({ X, Y }) => (
                <g>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={h - pad.t - pad.b} />
                    </clipPath>
                  </defs>
                  <g clip-path={`url(#${clipId})`}>
                    {!compress &&
                      pts.map(([x, y], i) => (
                        <line key={'r' + i} x1={X(x)} y1={Y(y)} x2={X(proj[i].fx)} y2={Y(proj[i].fy)} stroke="var(--ink-3)" stroke-opacity="0.4" />
                      ))}
                    {compress &&
                      pts.map(([x, y], i) => (
                        <line key={'c' + i} x1={X(x)} y1={Y(y)} x2={X(recon[i].fx)} y2={Y(recon[i].fy)} stroke="var(--marker)" stroke-opacity="0.35" />
                      ))}
                    {compress && (
                      <line
                        x1={X(C.mx - L * u1[0])}
                        y1={Y(C.my - L * u1[1])}
                        x2={X(C.mx + L * u1[0])}
                        y2={Y(C.my + L * u1[1])}
                        stroke="var(--marker)"
                        stroke-width="1.5"
                        stroke-dasharray="5 4"
                      />
                    )}
                    <line x1={X(C.mx - L * ux)} y1={Y(C.my - L * uy)} x2={X(C.mx + L * ux)} y2={Y(C.my + L * uy)} stroke="var(--ink)" stroke-width="1.8" />
                    {pts.map(([x, y], i) => (
                      <circle key={'p' + i} cx={X(x)} cy={Y(y)} r="3.3" fill="var(--c1)" fill-opacity="0.62" />
                    ))}
                    {!compress &&
                      proj.map((p, i) => {
                        // short tick across the line at each foot of the perpendicular
                        const fx = X(p.fx);
                        const fy = Y(p.fy);
                        return <line key={'f' + i} x1={fx - 3.5 * uy} y1={fy - 3.5 * ux} x2={fx + 3.5 * uy} y2={fy + 3.5 * ux} stroke="var(--marker)" stroke-width="1.6" />;
                      })}
                    {compress &&
                      recon.map((p, i) => <circle key={'q' + i} cx={X(p.fx)} cy={Y(p.fy)} r="2.6" fill="var(--paper)" stroke="var(--marker)" stroke-width="1.4" />)}
                  </g>
                  {showPC && (
                    <g>
                      <Arrow x1={X(C.mx)} y1={Y(C.my)} x2={X(C.mx + 0.95 * u1[0])} y2={Y(C.my + 0.95 * u1[1])} color="var(--ink)" />
                      <Arrow x1={X(C.mx)} y1={Y(C.my)} x2={X(C.mx + 0.95 * u2[0])} y2={Y(C.my + 0.95 * u2[1])} color="var(--ink)" />
                      <text class="lbl-strong" x={X(C.mx + 0.8 * u1[0] + 0.24 * u2[0])} y={Y(C.my + 0.8 * u1[1] + 0.24 * u2[1])} text-anchor="middle">
                        c₁ (PC1)
                      </text>
                      <text class="lbl-strong" x={X(C.mx + 1.1 * u2[0]) - 4} y={Y(C.my + 1.1 * u2[1])} text-anchor="end">
                        c₂ (PC2)
                      </text>
                    </g>
                  )}
                  <circle cx={X(hx)} cy={Y(hy)} r="8" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" />
                  <circle cx={X(hx)} cy={Y(hy)} r="2.5" fill="var(--ink)" />
                </g>
              )}
            </Plot>
          </div>
          <div>
            <div class="pca-explorer-strip-cap">
              Projected coordinate z on the line (1-D): spread = variance kept {fmt(captured * 100, 0)}%
            </div>
            <svg class="plot" viewBox={`0 0 ${w} 46`} role="img" aria-label="Projected points on a line">
              <line x1="14" x2={w - 14} y1="23" y2="23" stroke="var(--ink)" stroke-width="1.5" />
              {proj.map((p, i) => (
                <circle key={i} cx={zS(p.z)} cy="23" r="3.4" fill="var(--c1)" fill-opacity="0.35" />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <div ref={ref2} style={{ minWidth: 0 }}>
        <div class="pca-explorer-strip-cap" style={{ marginBottom: '4px' }}>
          Variance kept for every direction: the peak is PC1, the dip (90° away) is PC2
        </div>
        <Plot
          w={w2}
          h={170}
          x={[0, 180]}
          y={[0, 100]}
          pad={{ l: 40, r: 20, t: 12, b: 34 }}
          xTicks={[0, 30, 60, 90, 120, 150, 180]}
          yTicks={[0, 25, 50, 75, 100]}
          xFmt={(v) => v + '°'}
          yFmt={(v) => v + '%'}
          xLabel="direction of the line"
          label="Variance kept against direction"
        >
          {({ X, Y, h: hh, pad: pp }) => {
            const p2 = norm180(E.deg + 90);
            return (
              <g>
                <path d={linePath(curve, X, Y)} fill="none" stroke="var(--biro)" stroke-width="2.2" />
                <circle cx={X(E.deg)} cy={Y(E.ratio[0] * 100)} r="4" fill="var(--tick)" />
                <text class="lbl" x={X(E.deg)} y={Y(E.ratio[0] * 100) - 9} text-anchor="middle">
                  PC1 {fmt(E.ratio[0] * 100, 0)}%
                </text>
                <circle cx={X(p2)} cy={Y(E.ratio[1] * 100)} r="4" fill="var(--ink-3)" />
                <text class="lbl" x={X(p2)} y={Y(E.ratio[1] * 100) - 8} text-anchor="middle">
                  PC2 {fmt(E.ratio[1] * 100, 0)}%
                </text>
                <line x1={X(deg)} x2={X(deg)} y1={pp.t} y2={hh - pp.b} stroke="var(--marker)" stroke-dasharray="4 3" />
                <circle cx={X(deg)} cy={Y(captured * 100)} r="5" fill="var(--marker)" stroke="var(--paper)" stroke-width="1.5" />
              </g>
            );
          }}
        </Plot>
      </div>

      <hr class="pca-explorer-hr" />
      <div class="pca-explorer-sec">How many components?</div>
      <div class="wg-split">
        <div class="wg-controls">
          <Slider label="Variance to keep, t" value={t} min={0.8} max={0.99} step={0.01} onInput={setT} format={(v) => fmt(v, 2)} />
          <div class="readouts">
            <Readout label="Components d" value={dSel} sub={`of 12 keep ${fmt(cs[dSel - 1] * 100, 0)}% ≥ ${fmt(t * 100, 0)}%`} tone="blue" />
          </div>
          <div class="pca-explorer-code">
            {'cumsum = np.cumsum(\n    pca.explained_variance_ratio_)\n'}
            {`d = np.argmax(cumsum >= ${fmt(t, 2)}) + 1\n`}
            <span class="pca-explorer-cm">{`# → d = ${dSel}; or let PCA choose:`}</span>
            {`\nPCA(n_components=${fmt(t, 2)})`}
          </div>
        </div>
        <div class="wg-plot" ref={ref4} style={{ minWidth: 0 }}>
          <Plot
            w={w4}
            h={230}
            x={[0.3, 12.7]}
            y={[0, 1]}
            pad={{ l: 40, r: 12, t: 12, b: 36 }}
            xTicks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
            yTicks={[0, 0.25, 0.5, 0.75, 1]}
            xFmt={(v) => String(v)}
            xLabel="number of components"
            label="Explained variance ratio per component with the cumulative sum"
          >
            {({ X, Y, h: hh, pad: pp, w: ww }) => {
              const bw = Math.max(6, (X(2) - X(1)) * 0.62);
              return (
                <g>
                  {RATIOS12.map((r, i) => (
                    <rect
                      key={i}
                      x={X(i + 1) - bw / 2}
                      y={Y(r)}
                      width={bw}
                      height={Y(0) - Y(r)}
                      fill={i < dSel ? 'var(--c1-soft)' : 'var(--paper-3)'}
                      stroke={i < dSel ? 'var(--c1)' : 'var(--rule-2)'}
                    />
                  ))}
                  <line x1={pp.l} x2={ww - pp.r} y1={Y(t)} y2={Y(t)} stroke="var(--marker)" stroke-dasharray="5 4" />
                  <text class="lbl" x={pp.l + 6} y={Y(t) + 14}>
                    t = {fmt(t, 2)}
                  </text>
                  <line x1={X(dSel)} x2={X(dSel)} y1={Y(cs[dSel - 1])} y2={hh - pp.b} stroke="var(--marker)" stroke-dasharray="2 3" />
                  <path d={linePath(cs.map((c, i) => [i + 1, c]), X, Y)} fill="none" stroke="var(--ink)" stroke-width="2" />
                  {cs.map((c, i) => (
                    <circle key={'c' + i} cx={X(i + 1)} cy={Y(c)} r={i + 1 === dSel ? 5 : 3} fill={i + 1 === dSel ? 'var(--marker)' : 'var(--ink)'} />
                  ))}
                  <text class="lbl" x={X(elb) + 6} y={Y(cs[elb - 1]) + 18}>
                    ↖ elbow
                  </text>
                </g>
              );
            }}
          </Plot>
          <div class="wg-legend">
            <span>
              <span class="sw" style={{ background: 'var(--c1-soft)', border: '1px solid var(--c1)' }} />
              explained_variance_ratio_ (bars; kept ones blue)
            </span>
            <span>
              <span class="sw" style={{ background: 'var(--ink)' }} />
              cumulative sum (line)
            </span>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
