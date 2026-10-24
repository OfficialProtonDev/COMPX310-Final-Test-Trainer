// Small helpers shared by team d's widgets (weeks 2-6). No components here.
import { useRef, useState, useLayoutEffect } from 'preact/hooks';

/**
 * Measure a wrapper's width so a plot can use it as its viewBox width (1 unit = 1 px),
 * which keeps SVG text at its CSS size on phones and on wide screens alike.
 * Returns [ref, width]; put ref on a block-level wrapper whose width does not depend on its content.
 */
export function useWidth(initial = 360) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const cw = Math.floor(el.getBoundingClientRect().width);
      if (cw > 0) setW((old) => (Math.abs(old - cw) >= 1 ? cw : old));
    };
    read();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** SVG path for a marker centred at (x, y). shape: circle | square | triangle | diamond | plus | cross. */
export function marker(shape, x, y, r) {
  const f = (v) => +v.toFixed(2);
  switch (shape) {
    case 'square': {
      const s = r * 0.86;
      return `M${f(x - s)},${f(y - s)}h${f(2 * s)}v${f(2 * s)}h${f(-2 * s)}Z`;
    }
    case 'triangle': {
      const s = r * 1.15;
      return `M${f(x)},${f(y - s)}L${f(x + s * 0.94)},${f(y + s * 0.62)}L${f(x - s * 0.94)},${f(y + s * 0.62)}Z`;
    }
    case 'diamond': {
      const s = r * 1.2;
      return `M${f(x)},${f(y - s)}L${f(x + s)},${f(y)}L${f(x)},${f(y + s)}L${f(x - s)},${f(y)}Z`;
    }
    case 'plus':
      return `M${f(x - r)},${f(y)}H${f(x + r)}M${f(x)},${f(y - r)}V${f(y + r)}`;
    case 'cross': {
      const s = r * 0.8;
      return `M${f(x - s)},${f(y - s)}L${f(x + s)},${f(y + s)}M${f(x + s)},${f(y - s)}L${f(x - s)},${f(y + s)}`;
    }
    default:
      return `M${f(x - r)},${f(y)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0Z`;
  }
}

/** Thousands separators (266610 -> "266,610"). */
export const commas = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '–');
