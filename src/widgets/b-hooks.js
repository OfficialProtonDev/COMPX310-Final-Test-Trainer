// Layout helpers shared by team b's widgets (Weeks 8–9).
import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

/**
 * Measure an element's width so an SVG can use viewBox width = rendered width (1 unit = 1 CSS px).
 * Text then stays at its true size on a 400 px phone instead of shrinking with the plot.
 * Returns a callback ref (re-attaches if the element is swapped, e.g. when a mode switch remounts a plot).
 */
export function useWidth(initial = 420) {
  const [w, setW] = useState(initial);
  const ro = useRef(null);
  const ref = useCallback((el) => {
    if (ro.current) {
      ro.current.disconnect();
      ro.current = null;
    }
    if (!el) return;
    const read = () => {
      const cw = Math.floor(el.getBoundingClientRect().width) - 2; // svg.plot has a 1px border each side
      if (cw > 100) setW((p) => (Math.abs(p - cw) >= 1 ? cw : p));
    };
    read();
    if (typeof ResizeObserver !== 'undefined') {
      ro.current = new ResizeObserver(read);
      ro.current.observe(el);
    }
  }, []);
  useEffect(() => () => ro.current && ro.current.disconnect(), []);
  return [ref, w];
}

/**
 * Plot box with an equal x/y scale (so perpendicular looks perpendicular and distances are true).
 * The domain is widened symmetrically along x or y when the height has to be clamped.
 */
export function equalAspect(w, pad, dom, { minH = 170, maxH = 400 } = {}) {
  const iw = w - pad.l - pad.r;
  const dx = dom.x[1] - dom.x[0];
  const dy = dom.y[1] - dom.y[0];
  let ih = (iw * dy) / dx;
  let x = dom.x;
  let y = dom.y;
  if (ih > maxH) {
    ih = maxH;
    const nx = (iw * dy) / ih;
    const cx = (dom.x[0] + dom.x[1]) / 2;
    x = [cx - nx / 2, cx + nx / 2];
  } else if (ih < minH) {
    ih = minH;
    const ny = (ih * dx) / iw;
    const cy = (dom.y[0] + dom.y[1]) / 2;
    y = [cy - ny / 2, cy + ny / 2];
  }
  return { x, y, h: Math.round(ih + pad.t + pad.b) };
}
