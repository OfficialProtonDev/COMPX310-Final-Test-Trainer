// Small helpers shared by team c's widgets (no classes, tokens only).
import { useRef, useState, useLayoutEffect } from 'preact/hooks';

/**
 * Measures an element's width so an SVG can use a 1:1 viewBox (text stays at its real px size on phones and desktops).
 * Returns [ref, width]; width falls back to `def` until measured (or when hidden).
 */
export function useWidth(def = 360) {
  const ref = useRef(null);
  const [w, setW] = useState(def);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = () => {
      const cw = Math.floor(el.getBoundingClientRect().width);
      if (cw > 40) setW((old) => (Math.abs(old - cw) > 1 ? cw : old));
    };
    set();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Widen the x or y domain so one data unit spans the same number of pixels on both axes (circles stay round). */
export function equalDomain(x, y, iw, ih) {
  const kx = iw / (x[1] - x[0]);
  const ky = ih / (y[1] - y[0]);
  if (kx > ky) {
    const half = iw / ky / 2;
    const c = (x[0] + x[1]) / 2;
    return [[c - half, c + half], y];
  }
  const half = ih / kx / 2;
  const c = (y[0] + y[1]) / 2;
  return [x, [c - half, c + half]];
}

/** Plain checkbox with a label, styled from tokens. */
export function Check({ checked, onChange, children }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer', minHeight: '30px' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        style={{ accentColor: 'var(--biro)', width: '16px', height: '16px', margin: 0, flex: 'none' }}
      />
      <span>{children}</span>
    </label>
  );
}

/** Categorical colour/soft-colour for cluster index j (0-based); 7th and 8th fall back to neutral tokens. */
export const CL = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--ink-3)', 'var(--ink)'];
export const CL_SOFT = ['var(--c1-soft)', 'var(--c2-soft)', 'var(--c3-soft)', 'var(--c4-soft)', 'var(--c5-soft)', 'var(--c6-soft)', 'var(--paper-3)', 'var(--hl)'];

/** Marker path (centred at x, y, radius r) for shape index j: circle, square, triangle, diamond, triangle-down, plus, hexagon, star. */
export function shapePath(j, x, y, r) {
  const f = (v) => v.toFixed(1);
  switch (j % 8) {
    case 0:
      return `M${f(x - r)},${f(y)}a${r},${r} 0 1,0 ${f(2 * r)},0a${r},${r} 0 1,0 ${f(-2 * r)},0Z`;
    case 1: {
      const s = r * 0.88;
      return `M${f(x - s)},${f(y - s)}h${f(2 * s)}v${f(2 * s)}h${f(-2 * s)}Z`;
    }
    case 2:
      return `M${f(x)},${f(y - r * 1.15)}L${f(x + r * 1.05)},${f(y + r * 0.75)}L${f(x - r * 1.05)},${f(y + r * 0.75)}Z`;
    case 3:
      return `M${f(x)},${f(y - r * 1.2)}L${f(x + r * 1.05)},${f(y)}L${f(x)},${f(y + r * 1.2)}L${f(x - r * 1.05)},${f(y)}Z`;
    case 4:
      return `M${f(x)},${f(y + r * 1.15)}L${f(x + r * 1.05)},${f(y - r * 0.75)}L${f(x - r * 1.05)},${f(y - r * 0.75)}Z`;
    case 5: {
      const a = r * 0.38;
      const b = r * 1.1;
      return `M${f(x - a)},${f(y - b)}h${f(2 * a)}v${f(b - a)}h${f(b - a)}v${f(2 * a)}h${f(a - b)}v${f(b - a)}h${f(-2 * a)}v${f(a - b)}h${f(a - b)}v${f(-2 * a)}h${f(b - a)}Z`;
    }
    case 6: {
      let d = '';
      for (let i = 0; i < 6; i++) {
        const t = (Math.PI / 3) * i + Math.PI / 6;
        d += (i ? 'L' : 'M') + f(x + r * 1.08 * Math.cos(t)) + ',' + f(y + r * 1.08 * Math.sin(t));
      }
      return d + 'Z';
    }
    default: {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const t = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 ? r * 0.55 : r * 1.3;
        d += (i ? 'L' : 'M') + f(x + rr * Math.cos(t)) + ',' + f(y + rr * Math.sin(t));
      }
      return d + 'Z';
    }
  }
}

export const SHAPE_NAMES = ['circle', 'square', 'triangle', 'diamond', 'down-triangle', 'plus', 'hexagon', 'star'];
