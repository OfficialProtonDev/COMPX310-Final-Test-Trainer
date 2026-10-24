// Shared helper for the W7 ensemble widgets (team a).
import { useState, useRef, useLayoutEffect } from 'preact/hooks';

/**
 * Measures a wrapper element so an SVG plot can use its width as the viewBox width and draw 1:1.
 * Plot text then keeps its real pixel size at 400 px and at 1000 px. Returns [ref, width].
 */
export function useBoxWidth(fallback = 420, min = 240, max = 900) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const cw = el.clientWidth - 2; // svg.plot draws a 1px border inside its box
      if (cw > 0) {
        const nw = Math.max(min, Math.min(max, Math.round(cw)));
        setW((old) => (old === nw ? old : nw));
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max]);
  return [ref, w];
}
