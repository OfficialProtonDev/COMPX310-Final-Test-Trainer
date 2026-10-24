// Large-margin linear SVM: drag points and watch the street (W8 s3–6, s22–26; 2019 paper Q51).
import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import { WidgetFrame, Plot, Slider, Seg, Btn, Fb, Readout } from '../ui.jsx';
import { fmt, fix, pct, clamp, scale, svgPoint } from '../lib/svg.js';
import { fitLinearSvm, clipLine, clipHalf, scalerFit, scalerApply, scalerInvert } from './svm-math.js';
import { PRESETS } from './svm-presets.js';
import { useWidth, equalAspect } from './b-hooks.js';

const MAX_PTS = 40;
const PAD = { l: 44, r: 14, t: 14, b: 38 };

const css = `
.svm-margin { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
.svm-margin-split { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@container (min-width: 700px) { .svm-margin-split { grid-template-columns: minmax(0, 1fr) minmax(240px, 280px); } }
.svm-margin-plot { min-width: 0; display: grid; gap: 8px; }
.svm-margin-plot svg.plot { cursor: crosshair; }
.svm-margin-plot.rm svg.plot, .svm-margin-plot.locked svg.plot { cursor: default; }
.svm-margin-pt { cursor: grab; outline: none; }
.svm-margin-plot.rm .svm-margin-pt, .svm-margin-plot.locked .svm-margin-pt { cursor: pointer; }
.svm-margin-pt .svm-margin-focus { fill: none; stroke: none; }
.svm-margin-pt:focus-visible .svm-margin-focus { stroke: var(--biro); stroke-width: 2; stroke-dasharray: 3 2; }
.svm-margin-halo { paint-order: stroke; stroke: var(--plot-bg); stroke-width: 4px; stroke-linejoin: round; }
.svm-margin-lg { display: inline-flex; align-items: center; gap: 5px; }
.svm-margin-lg svg { flex: none; }
.svm-margin-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.svm-margin-presets .seg button { padding: 6px 9px; }
`;

const fmtC = (c) => (c >= 99.5 ? fmt(c, 0) : c >= 9.95 ? fmt(c, 1) : c >= 0.995 ? fmt(c, 2) : fmt(c, 3));
const poly = (pts, X, Y) => pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');

/** Marker shapes: class A circle, class B cross (shape carries the class, not only colour). */
function Mark({ c, col, x, y, r = 6 }) {
  if (c === 'A') return <circle cx={x} cy={y} r={r} fill={col} stroke="var(--plot-bg)" stroke-width="1.5" />;
  const k = r * 0.85;
  return (
    <g stroke-linecap="round">
      <path d={`M${x - k},${y - k}L${x + k},${y + k}M${x - k},${y + k}L${x + k},${y - k}`} stroke="var(--plot-bg)" stroke-width="5.5" />
      <path d={`M${x - k},${y - k}L${x + k},${y + k}M${x - k},${y + k}L${x + k},${y - k}`} stroke={col} stroke-width="2.8" />
    </g>
  );
}

function Swatch({ children }) {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function SvmMargin({ preset = 'separable' }) {
  const focused = preset === 'exam2019';
  const start = PRESETS[preset] ? preset : 'separable';
  const nextId = useRef(0);
  const withIds = (arr) => arr.map((p) => ({ ...p, id: nextId.current++ }));
  const [key, setKey] = useState(start);
  const [pts, setPts] = useState(() => withIds(PRESETS[start].points));
  const [logC, setLogC] = useState(3);
  const [tool, setTool] = useState('A');
  const [scaler, setScaler] = useState(null); // frozen StandardScaler when "Standardised" is on
  const [guess, setGuess] = useState([]);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [edited, setEdited] = useState(false);
  const [msg, setMsg] = useState(null);
  const [settled, setSettled] = useState(null);
  const [wrapRef, W] = useWidth(560);
  const svgRef = useRef(null);
  const drag = useRef(null);

  const P = PRESETS[key];
  const C = 10 ** logC;
  const locked = !!P.exam && !revealed; // exam: guess support vectors before anything is drawn
  const colA = P.swapColours ? 'var(--cB)' : 'var(--cA)';
  const colB = P.swapColours ? 'var(--cA)' : 'var(--cB)';
  const softA = P.swapColours ? 'var(--c2-soft)' : 'var(--c1-soft)';
  const softB = P.swapColours ? 'var(--c1-soft)' : 'var(--c2-soft)';

  const toView = (p) => (scaler ? scalerApply(scaler, [p.x, p.y]) : [p.x, p.y]);
  const toRaw = (v) => (scaler ? scalerInvert(scaler, v) : v);
  const view = useMemo(() => pts.map((p) => { const v = toView(p); return { ...p, x: v[0], y: v[1] }; }), [pts, scaler]);
  const fit = useMemo(() => fitLinearSvm(view, C), [view, C]);

  // Unscaled preset: compare street widths in standard-deviation units (fair across the two fits)
  const scaleCmp = useMemo(() => {
    if (!P.scalable) return null;
    const s = scaler || scalerFit(pts.map((p) => [p.x, p.y]));
    const raw = fitLinearSvm(pts, C);
    const z = fitLinearSvm(pts.map((p) => { const v = scalerApply(s, [p.x, p.y]); return { ...p, x: v[0], y: v[1] }; }), C);
    if (!raw || !z) return null;
    return { rawUnits: raw.width, rawSd: 2 / Math.hypot(raw.w[0] * s.sd[0], raw.w[1] * s.sd[1]), zSd: z.width };
  }, [pts, C, scaler, P.scalable]);

  // ---- plot box (equal x/y scale except the deliberately squashed raw "Unscaled" view, as on slide s4)
  const dom = scaler ? P.zDomain : P.domain;
  const box = P.scalable && !scaler
    ? { x: dom.x, y: dom.y, h: Math.round(clamp((W - PAD.l - PAD.r) * 0.6, 170, 330) + PAD.t + PAD.b) }
    : equalAspect(W, PAD, dom, { minH: 170, maxH: 360 });
  const X = scale(box.x[0], box.x[1], PAD.l, W - PAD.r);
  const Y = scale(box.y[0], box.y[1], box.h - PAD.b, PAD.t);

  const load = (k) => {
    setKey(k);
    setPts(withIds(PRESETS[k].points));
    setScaler(null);
    setGuess([]);
    setChecked(false);
    setRevealed(false);
    setEdited(false);
    setMsg(null);
    setLogC(3);
    setTool('A');
    drag.current = null;
  };

  // feedback after a drag / add / remove, computed once the new fit has rendered
  useEffect(() => {
    if (!settled) return;
    const d = settled;
    setSettled(null);
    if (!d.before || !fit) return;
    const moved = Math.abs(fit.w[0] - d.before.w[0]) + Math.abs(fit.w[1] - d.before.w[1]) + Math.abs(fit.b - d.before.b) > 1e-6 * (1 + fit.norm + Math.abs(fit.b));
    let m = null;
    if (d.type === 'remove') {
      m = moved
        ? { kind: 'info', text: 'You removed a support vector, so the street changed.' }
        : { kind: 'good', text: 'You removed a point that was not a support vector: the street did not change.' };
    } else if (d.type === 'add') {
      m = moved
        ? { kind: 'info', text: 'The new point is on or inside the street, so it became a support vector and the street moved.' }
        : { kind: 'good', text: 'The new point is outside the street: not a support vector, so nothing changed.' };
    } else if (d.moved) {
      if (!moved) m = { kind: 'good', text: 'The street did not move: that point is not a support vector (its α = 0).' };
      else if (d.wasSv) m = { kind: 'info', text: 'The street moved: you moved a support vector.' };
      else m = { kind: 'info', text: 'The street moved: the point entered the street, so it became a support vector.' };
    }
    if (m) setMsg(m);
  }, [settled]);

  const snapshot = (id) => {
    const i = view.findIndex((p) => p.id === id);
    return { before: fit ? { w: fit.w.slice(), b: fit.b } : null, wasSv: !!(fit && i >= 0 && fit.isSv[i]) };
  };
  const toggleGuess = (id) => {
    setGuess((g) => (g.includes(id) ? g.filter((v) => v !== id) : [...g, id]));
    setChecked(false);
  };
  const removePt = (id) => {
    setSettled({ type: 'remove', ...snapshot(id) });
    setPts((ps) => ps.filter((p) => p.id !== id));
    setEdited(true);
  };
  const dataAt = (e) => {
    const s = svgPoint(svgRef.current, e);
    return toRaw([clamp(X.invert(s.x), box.x[0], box.x[1]), clamp(Y.invert(s.y), box.y[0], box.y[1])]);
  };

  const onDown = (e) => {
    if (e.button) return;
    const el = e.target.closest && e.target.closest('[data-pid]');
    const id = el ? +el.getAttribute('data-pid') : null;
    if (locked) {
      if (id != null) toggleGuess(id);
      return;
    }
    if (tool === 'remove') {
      if (id != null) removePt(id);
      return;
    }
    let target = id;
    const snap = snapshot(id);
    let type = 'drag';
    if (target == null) {
      if (pts.length >= MAX_PTS) {
        setMsg({ kind: 'hint', text: `That's the limit of ${MAX_PTS} points. Remove one first.` });
        return;
      }
      const [x, y] = dataAt(e);
      target = nextId.current++;
      type = 'add';
      setPts((ps) => [...ps, { x, y, c: tool, id: target }]);
      setEdited(true);
    }
    drag.current = { id: target, type, moved: false, ...snap };
    if (svgRef.current && svgRef.current.setPointerCapture) svgRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = dataAt(e);
    d.moved = true;
    setEdited(true);
    setPts((ps) => ps.map((p) => (p.id === d.id ? { ...p, x, y } : p)));
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (svgRef.current && svgRef.current.hasPointerCapture && svgRef.current.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    setSettled({ ...d });
  };
  const onKey = (e, p) => {
    if (locked) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleGuess(p.id);
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removePt(p.id);
      return;
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const k = e.shiftKey ? 5 : 1;
    const v = toView(p);
    const nv = [
      clamp(v[0] + (dir[0] * k * (box.x[1] - box.x[0])) / 60, box.x[0], box.x[1]),
      clamp(v[1] + (dir[1] * k * (box.y[1] - box.y[0])) / 60, box.y[0], box.y[1]),
    ];
    const [x, y] = toRaw(nv);
    setSettled({ type: 'drag', moved: true, ...snapshot(p.id) });
    setPts((ps) => ps.map((q) => (q.id === p.id ? { ...q, x, y } : q)));
    setEdited(true);
  };

  // ---- exam marking
  const svIds = fit ? view.filter((_, i) => fit.isSv[i]).map((p) => p.id) : [];
  const right = guess.filter((g) => svIds.includes(g));
  const wrong = guess.filter((g) => !svIds.includes(g));
  const showFit = fit && !locked;

  // ---- geometry of the street
  const rect = [[box.x[0], box.y[0]], [box.x[1], box.y[0]], [box.x[1], box.y[1]], [box.x[0], box.y[1]]];
  const geo = useMemo(() => {
    if (!fit || !(fit.norm > 0)) return null;
    const { w, b } = fit;
    const nw = [-w[0], -w[1]];
    return {
      regA: clipHalf(rect, w, b, 0),
      regB: clipHalf(rect, nw, -b, 0),
      street: clipHalf(clipHalf(rect, w, b, -1), nw, -b, -1),
      lines: [-1, 0, 1].map((c) => clipLine(w, b, c, box.x[0], box.x[1], box.y[0], box.y[1])),
    };
  }, [fit, box.x[0], box.x[1], box.y[0], box.y[1]]);

  // dimension arrow across the street, at the boundary point nearest the middle of the plot
  const arrow = (() => {
    if (!showFit || !geo || !(fit.norm > 0)) return null;
    const { w, b } = fit;
    const n2 = fit.norm * fit.norm;
    const cx = (box.x[0] + box.x[1]) / 2;
    const cy = (box.y[0] + box.y[1]) / 2;
    const t = (w[0] * cx + w[1] * cy + b) / n2;
    const p0 = [cx - t * w[0], cy - t * w[1]];
    const a = [p0[0] - w[0] / n2, p0[1] - w[1] / n2];
    const z = [p0[0] + w[0] / n2, p0[1] + w[1] / n2];
    const inside = (q) => q[0] >= box.x[0] && q[0] <= box.x[1] && q[1] >= box.y[0] && q[1] <= box.y[1];
    const len = Math.hypot(X(z[0]) - X(a[0]), Y(z[1]) - Y(a[1]));
    if (!inside(a) || !inside(z) || len < 22) return null;
    // label runs along the arrow, kept upright (−90° … 90°)
    let deg = (Math.atan2(Y(z[1]) - Y(a[1]), X(z[0]) - X(a[0])) * 180) / Math.PI;
    if (deg > 90) deg -= 180;
    if (deg < -90) deg += 180;
    return { a, z, p0, len, deg };
  })();

  const examText = (() => {
    if (!P.exam || !revealed || edited || !fit) return null;
    const svs = fit.sv.map((i) => `(${fmt(view[i].x, 2)}, ${fmt(view[i].y, 2)})`);
    const ym = fit.sv.reduce((s, i) => s + view[i].y, 0) / fit.sv.length;
    const xb = -(fit.w[1] * ym + fit.b) / fit.w[0];
    return `Only ${svs.join(' and ')} touch the street, so they are the only support vectors. The boundary runs halfway between them (almost vertical, x ≈ ${fmt(xb, 1)}), the dashed street edges pass through them, and the margin is the street's width, 2/‖w‖ ≈ ${fix(fit.width, 2)}: the distance between the two points.`;
  })();

  const presetOptions = Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label }));
  const hint = P.hint;

  return (
    <WidgetFrame
      title={focused ? '2019 paper Q51: draw the hard-margin SVM' : 'Large-margin linear SVM'}
      lead={
        focused
          ? 'Click the points you think a hard-margin SVM would use as support vectors, then Check. Reveal draws the boundary and the margin.'
          : 'Drag points and watch the street. Click empty space to add a point; ringed points are the support vectors.'
      }
      actions={
        focused ? null : (
          <div class="svm-margin-presets">
            <Seg label="Dataset" value={key} onChange={load} options={presetOptions} />
          </div>
        )
      }
      foot={
        focused ? (
          <span>
            Hard margin = the widest street with no point inside it. Only the points on its edges are support vectors (usually very
            few); the boundary runs down the middle of the street and the margin is the street's full width.
          </span>
        ) : (
          <span>
            The SVM fits the widest street; only the support vectors (on or inside it, α &gt; 0) define it, so moving any other point
            changes nothing. High C ≈ hard margin (narrow street, no violations), low C → wider street that tolerates violations; scale
            the features first, because the margin is measured in feature units.
          </span>
        )
      }
    >
      <style>{css}</style>
      <div class="svm-margin">
        <div class="svm-margin-split">
          <div class={`svm-margin-plot${tool === 'remove' && !locked ? ' rm' : ''}${locked ? ' locked' : ''}`} ref={wrapRef} onPointerCancel={onUp}>
            <Plot
              svgRef={svgRef}
              w={W}
              h={box.h}
              x={box.x}
              y={box.y}
              pad={PAD}
              xLabel={P.scalable ? (scaler ? 'x₀ (standardised)' : 'x₀') : 'x₁'}
              yLabel={P.scalable ? (scaler ? 'x₁ (standardised)' : 'x₁') : 'x₂'}
              label="Training points of two classes with the SVM decision boundary and street"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            >
              {({ X, Y }) => (
                <g>
                  {showFit && geo && (
                    <g aria-hidden="true">
                      {geo.regA.length > 2 && <polygon points={poly(geo.regA, X, Y)} fill={softA} fill-opacity="0.6" />}
                      {geo.regB.length > 2 && <polygon points={poly(geo.regB, X, Y)} fill={softB} fill-opacity="0.6" />}
                      {geo.street.length > 2 && <polygon points={poly(geo.street, X, Y)} fill="var(--hl)" fill-opacity="0.75" />}
                      {geo.lines.map((l, i) =>
                        l ? (
                          <line
                            key={i}
                            x1={X(l[0][0])}
                            y1={Y(l[0][1])}
                            x2={X(l[1][0])}
                            y2={Y(l[1][1])}
                            stroke={i === 1 ? 'var(--ink)' : 'var(--ink-2)'}
                            stroke-width={i === 1 ? 2.2 : 1.5}
                            stroke-dasharray={i === 1 ? null : '7 5'}
                          />
                        ) : null,
                      )}
                      {arrow && (
                        <g>
                          <line x1={X(arrow.a[0])} y1={Y(arrow.a[1])} x2={X(arrow.z[0])} y2={Y(arrow.z[1])} stroke="var(--ink)" stroke-width="1.3" />
                          {[arrow.a, arrow.z].map((q, i) => {
                            const o = i ? arrow.a : arrow.z;
                            const ang = Math.atan2(Y(q[1]) - Y(o[1]), X(q[0]) - X(o[0]));
                            const hx = X(q[0]);
                            const hy = Y(q[1]);
                            const s = 7;
                            return (
                              <path
                                key={i}
                                d={`M${hx},${hy}L${hx - s * Math.cos(ang - 0.4)},${hy - s * Math.sin(ang - 0.4)}L${hx - s * Math.cos(ang + 0.4)},${hy - s * Math.sin(ang + 0.4)}Z`}
                                fill="var(--ink)"
                              />
                            );
                          })}
                          {arrow.len >= 64 && (
                            <text
                              class="svm-margin-halo"
                              transform={`translate(${(X(arrow.a[0]) + X(arrow.z[0])) / 2} ${(Y(arrow.a[1]) + Y(arrow.z[1])) / 2}) rotate(${arrow.deg})`}
                              y="4"
                              text-anchor="middle"
                              font-size="12"
                              font-weight="700"
                              fill="var(--ink)"
                            >
                              2/‖w‖
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  )}
                  {view.map((p, i) => {
                    const px = X(p.x);
                    const py = Y(p.y);
                    const isSv = showFit && fit.isSv[i];
                    const g = guess.includes(p.id);
                    const gs = checked ? (svIds.includes(p.id) ? 'right' : 'wrong') : 'open';
                    return (
                      <g
                        key={p.id}
                        class="svm-margin-pt"
                        data-pid={p.id}
                        tabindex="0"
                        role="button"
                        aria-pressed={locked ? g : undefined}
                        aria-label={`Class ${p.c} point at (${fmt(p.x, 2)}, ${fmt(p.y, 2)})${isSv ? ', support vector' : ''}${g ? ', marked' : ''}`}
                        onKeyDown={(e) => onKey(e, pts[i])}
                      >
                        <circle cx={px} cy={py} r="14" fill="transparent" />
                        <circle class="svm-margin-focus" cx={px} cy={py} r="18" />
                        {isSv && <circle cx={px} cy={py} r="11" fill="none" stroke="var(--hint)" stroke-width="2.4" />}
                        {g && (
                          <circle
                            cx={px}
                            cy={py}
                            r="15"
                            fill="none"
                            stroke={gs === 'right' ? 'var(--tick)' : gs === 'wrong' ? 'var(--marker)' : 'var(--biro)'}
                            stroke-width="2.2"
                            stroke-dasharray={gs === 'right' ? null : '4 3'}
                          />
                        )}
                        <Mark c={p.c} col={p.c === 'A' ? colA : colB} x={px} y={py} />
                      </g>
                    );
                  })}
                  {P.exam && revealed && !edited && showFit && W >= 480 &&
                    fit.sv.map((i) => (
                      <text
                        key={'l' + i}
                        class="svm-margin-halo"
                        x={X(view[i].x) + (view[i].c === 'A' ? -16 : 16)}
                        y={Y(view[i].y) - 16}
                        text-anchor={view[i].c === 'A' ? 'end' : 'start'}
                        font-size="12"
                        font-weight="700"
                        fill="var(--ink)"
                      >
                        ({fmt(view[i].x, 2)}, {fmt(view[i].y, 2)})
                      </text>
                    ))}
                </g>
              )}
            </Plot>
            <div class="wg-legend" aria-hidden="true">
              <span class="svm-margin-lg">
                <Swatch><circle cx="11" cy="7" r="5" fill={colA} /></Swatch>
                {P.swapColours ? 'circles' : 'class A'}
              </span>
              <span class="svm-margin-lg">
                <Swatch><path d="M7,3L15,11M7,11L15,3" stroke={colB} stroke-width="2.6" stroke-linecap="round" /></Swatch>
                {P.swapColours ? 'crosses' : 'class B'}
              </span>
              {!locked && (
                <span class="svm-margin-lg">
                  <Swatch><circle cx="11" cy="7" r="5.5" fill="none" stroke="var(--hint)" stroke-width="2" /></Swatch>
                  support vector
                </span>
              )}
              {!locked && (
                <span class="svm-margin-lg">
                  <Swatch><line x1="1" x2="21" y1="7" y2="7" stroke="var(--ink)" stroke-width="2.2" /></Swatch>
                  boundary h = 0
                </span>
              )}
              {!locked && (
                <span class="svm-margin-lg">
                  <Swatch><rect x="1" y="2" width="20" height="10" fill="var(--hl)" /><line x1="1" x2="21" y1="2" y2="2" stroke="var(--ink-2)" stroke-dasharray="4 3" /><line x1="1" x2="21" y1="12" y2="12" stroke="var(--ink-2)" stroke-dasharray="4 3" /></Swatch>
                  street, edges h = ±1
                </span>
              )}
              {P.exam && (
                <span class="svm-margin-lg">
                  <Swatch><circle cx="11" cy="7" r="5.5" fill="none" stroke="var(--biro)" stroke-width="2" stroke-dasharray="3 2" /></Swatch>
                  your mark
                </span>
              )}
            </div>
          </div>

          <div class="wg-controls">
            {locked ? (
              <>
                <Fb kind="info">
                  {hint} Marked: {guess.length} point{guess.length === 1 ? '' : 's'}.
                </Fb>
                <div class="svm-margin-btns">
                  <Btn kind="primary" size="sm" disabled={!guess.length} onClick={() => setChecked(true)}>
                    Check
                  </Btn>
                  <Btn size="sm" onClick={() => { setRevealed(true); setChecked(true); setMsg(null); }}>
                    Reveal
                  </Btn>
                  <Btn size="sm" kind="ghost" disabled={!guess.length} onClick={() => { setGuess([]); setChecked(false); }}>
                    Clear marks
                  </Btn>
                </div>
                {checked && guess.length > 0 && (
                  wrong.length === 0 && right.length === svIds.length ? (
                    <Fb kind="good">Right: exactly these {svIds.length} points touch the street. Press Reveal to see it.</Fb>
                  ) : (
                    <Fb kind="bad">
                      You found {right.length} of {svIds.length} support vectors
                      {wrong.length ? `; ${wrong.length} marked point${wrong.length > 1 ? 's are' : ' is'} not a support vector (red dashed ring)` : ''}.
                      Support vectors are the points closest to the other class, the ones the widest street just touches.
                    </Fb>
                  )
                )}
              </>
            ) : (
              <>
                <Seg
                  label="Click on the plot"
                  value={tool}
                  onChange={setTool}
                  options={[
                    { value: 'A', label: P.swapColours ? 'Add circle' : 'Add A', title: 'Click empty space to add a class A point (circle)' },
                    { value: 'B', label: P.swapColours ? 'Add cross' : 'Add B', title: 'Click empty space to add a class B point (cross)' },
                    { value: 'remove', label: 'Remove', title: 'Click a point to delete it' },
                  ]}
                />
                <Slider
                  label="C (cost of violations)"
                  value={logC}
                  min={-2}
                  max={3}
                  step={0.05}
                  onInput={(v) => {
                    setLogC(v);
                    setMsg(null);
                  }}
                  format={(v) => fmtC(10 ** v) + (v >= 2.99 ? ' ≈ hard' : '')}
                  hint="Log scale, 0.01 to 1000."
                />
                {P.scalable && (
                  <Seg
                    label="Feature scaling"
                    value={scaler ? 'z' : 'raw'}
                    onChange={(v) => {
                      setScaler(v === 'z' ? scalerFit(pts.map((p) => [p.x, p.y])) : null);
                      setMsg(null);
                    }}
                    options={[
                      { value: 'raw', label: 'Raw features' },
                      { value: 'z', label: 'Standardise' },
                    ]}
                  />
                )}
                {fit ? (
                  <div class="readouts">
                    <Readout label="Margin width" value={Number.isFinite(fit.width) ? fix(fit.width, 2) : '∞'} sub="2 / ‖w‖" tone="blue" />
                    <Readout label="Support vectors" value={fit.sv.length} sub="ringed (α > 0)" />
                    <Readout label="Violations" value={fit.violations} sub="inside street or wrong side" />
                    <Readout label="Train accuracy" value={pct(fit.acc, 0)} sub={`${fit.errors} wrong side`} />
                  </div>
                ) : (
                  <Fb kind="hint">Add at least one point of each class to train the SVM.</Fb>
                )}
                {examText && <Fb kind="good">{examText}</Fb>}
                {P.scalable && scaleCmp && (
                  <Fb kind="info">
                    {scaler
                      ? `Standardised: the street is ${fmt(scaleCmp.zSd, 2)} standard deviations wide, versus ${fmt(scaleCmp.rawSd, 2)} when the SVM is fitted on raw features.`
                      : `Raw: the street is ${fmt(scaleCmp.rawUnits, 1)} units wide, but almost all of that is along x₁ (range 0–80), so in standard deviations it is only ${fmt(scaleCmp.rawSd, 2)}. Standardise and it becomes ${fmt(scaleCmp.zSd, 2)}.`}
                  </Fb>
                )}
                {msg ? <Fb kind={msg.kind}>{msg.text}</Fb> : !P.exam && !P.scalable && <Fb kind="hint">{hint}</Fb>}
                <div class="svm-margin-btns">
                  <Btn size="sm" onClick={() => load(key)}>
                    {P.exam ? 'Start again' : 'Reset'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
