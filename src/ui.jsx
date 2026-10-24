// Shared UI kit: every view and widget builds from these so the app looks like one thing.
import { useId } from 'preact/hooks';
import { scale, ticks, fmt } from './lib/svg.js';

/** Render a trusted HTML string from our own content files. */
export function Html({ html, as: Tag = 'span', class: cls, ...rest }) {
  return <Tag class={cls} {...rest} dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

export function Btn({ kind, size, class: cls = '', children, ...rest }) {
  const k = [kind && kind.split(' ').join(' '), size].filter(Boolean).join(' ');
  return (
    <button type="button" class={`btn ${k} ${cls}`.trim()} {...rest}>
      {children}
    </button>
  );
}

/** Segmented control. options: [{ value, label, title? }] */
export function Seg({ options, value, onChange, label, class: cls = '' }) {
  return (
    <div class={`seg ${cls}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          class={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Labelled range slider with a live value readout. */
export function Slider({ label, value, min, max, step = 1, onInput, format = (v) => fmt(v, 3), hint, id }) {
  const auto = useId();
  const sid = id || 'sl-' + auto;
  return (
    <div class="ctl">
      <div class="ctl-top">
        <label class="ctl-label" for={sid}>
          {label}
        </label>
        <output class="ctl-val" for={sid}>
          {format(value)}
        </output>
      </div>
      <input
        id={sid}
        class="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(+e.currentTarget.value)}
      />
      {hint && <div class="ctl-hint">{hint}</div>}
    </div>
  );
}

/** Small number box. */
export function Num({ value, onChange, step = 1, min, max, width = 64, label, id, class: cls = '' }) {
  const auto = useId();
  return (
    <input
      id={id || 'n-' + auto}
      class={`input num ${cls}`}
      style={{ width: width + 'px' }}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      aria-label={label}
      value={value}
      onInput={(e) => {
        const v = e.currentTarget.value;
        if (v === '' || v === '-') return;
        const n = +v;
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

/** Editable matrix of numbers. value: number[][] */
export function MatrixInput({ value, onChange, label, cellWidth = 52, highlight }) {
  return (
    <table class="mx-in" aria-label={label}>
      <tbody>
        {value.map((row, i) => (
          <tr key={i}>
            {row.map((v, j) => (
              <td key={j} class={highlight && highlight(i, j) ? 'hl' : ''}>
                <Num
                  value={v}
                  width={cellWidth}
                  label={`${label || 'cell'} row ${i + 1} column ${j + 1}`}
                  onChange={(n) => {
                    const next = value.map((r) => r.slice());
                    next[i][j] = n;
                    onChange(next);
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Read-only matrix display. */
export function Matrix({ value, highlight, dp = 2, label, class: cls = '' }) {
  return (
    <table class={`mx ${cls}`} aria-label={label}>
      <tbody>
        {value.map((row, i) => (
          <tr key={i}>
            {row.map((v, j) => (
              <td key={j} class={highlight && highlight(i, j) ? 'hl' : ''}>
                {typeof v === 'number' ? fmt(v, dp) : v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Feedback line. kind: good | bad | hint | info */
export function Fb({ kind = 'info', mark, children }) {
  const m = mark ?? { good: '✓', bad: '✗', hint: '!', info: 'i' }[kind];
  return (
    <div class={`fb ${kind}`} role={kind === 'bad' ? 'alert' : undefined}>
      <span class="mark" aria-hidden="true">
        {m}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Chip({ kind, children, title }) {
  return (
    <span class={`chip ${kind || ''}`} title={title}>
      {children}
    </span>
  );
}

/**
 * The standard frame for an interactive visual.
 * title: short name; lead: one sentence on what to try; foot: the takeaway (what this shows).
 */
export function WidgetFrame({ title, lead, children, foot, actions, id }) {
  return (
    <section class="wg card" id={id} aria-label={title}>
      <header class="wg-head">
        <div class="wg-titles">
          <h3 class="wg-title">{title}</h3>
          {lead && <p class="wg-lead">{lead}</p>}
        </div>
        {actions && <div class="wg-actions">{actions}</div>}
      </header>
      <div class="wg-body">{children}</div>
      {foot && (
        <footer class="wg-foot">
          <span class="wg-foot-k">Takeaway</span>
          <div>{foot}</div>
        </footer>
      )}
    </section>
  );
}

/** Big labelled number. */
export function Readout({ label, value, sub, tone }) {
  return (
    <div class={`readout ${tone || ''}`}>
      <div class="readout-k">{label}</div>
      <div class="readout-v">{value}</div>
      {sub && <div class="readout-s">{sub}</div>}
    </div>
  );
}

/**
 * SVG plot with axes and grid. children is a function ({X, Y, w, h, pad}) => svg nodes.
 * x, y: [min, max] data domains. All colours come from CSS tokens so both themes work.
 */
export function Plot({
  w = 420,
  h = 280,
  x = [0, 1],
  y = [0, 1],
  pad = { l: 40, r: 12, t: 12, b: 34 },
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  grid = true,
  xFmt = (v) => fmt(v, 2),
  yFmt = (v) => fmt(v, 2),
  label,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  class: cls = '',
  children,
  axes = true,
}) {
  const X = scale(x[0], x[1], pad.l, w - pad.r);
  const Y = scale(y[0], y[1], h - pad.b, pad.t);
  const xt = xTicks || ticks(x[0], x[1], Math.max(2, Math.round((w - pad.l - pad.r) / 70)));
  const yt = yTicks || ticks(y[0], y[1], Math.max(2, Math.round((h - pad.t - pad.b) / 50)));
  return (
    <svg
      ref={svgRef}
      class={`plot ${cls}`}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      {grid &&
        yt.map((v) => <line key={'gy' + v} class="grid" x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} />)}
      {grid &&
        xt.map((v) => <line key={'gx' + v} class="grid" y1={pad.t} y2={h - pad.b} x1={X(v)} x2={X(v)} />)}
      {axes && (
        <g class="axis">
          <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} />
          <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} />
          {xt.map((v) => (
            <text key={'tx' + v} x={X(v)} y={h - pad.b + 14} text-anchor="middle">
              {xFmt(v)}
            </text>
          ))}
          {yt.map((v) => (
            <text key={'ty' + v} x={pad.l - 6} y={Y(v) + 3.5} text-anchor="end">
              {yFmt(v)}
            </text>
          ))}
          {xLabel && (
            <text class="axis-label" x={(pad.l + w - pad.r) / 2} y={h - 4} text-anchor="middle">
              {xLabel}
            </text>
          )}
          {yLabel && (
            <text
              class="axis-label"
              transform={`translate(11 ${(pad.t + h - pad.b) / 2}) rotate(-90)`}
              text-anchor="middle"
            >
              {yLabel}
            </text>
          )}
        </g>
      )}
      {children && children({ X, Y, w, h, pad })}
    </svg>
  );
}

/** Small horizontal bar for probabilities/percentages (0..1). */
export function Bar({ value, tone = 'biro', label }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div class="hbar" role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <span class={`hbar-fill ${tone}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
