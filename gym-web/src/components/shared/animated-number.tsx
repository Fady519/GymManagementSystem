"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/format";

/** Same curve as before ([0.16, 1, 0.3, 1]): fast start, soft landing. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const DURATION_MS = 900;

/**
 * A number that counts up to its value (and glides to new values when the data refreshes).
 * The text is written straight into the element on each animation frame, so React doesn't
 * re-render 60 times a second. People who prefer reduced motion get the final value at once.
 * Without `format`, it shows a whole number in the site language's style (like useFormat().number).
 *
 * It uses a tiny requestAnimationFrame loop instead of an animation library, so pages that only
 * need a counter (like the public home page) don't download one.
 */
export function AnimatedNumber({
  value,
  format: customFormat,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const locale = useLocale();
  const format = customFormat ?? ((n: number) => formatNumber(Math.round(n), locale));
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
  });

  // useLayoutEffect runs before the browser paints, so the starting number is on screen
  // from the first frame (no flash of the final value before the count-up).
  useLayoutEffect(() => {
    const write = (n: number) => {
      shown.current = n;
      // Change React's own text node (not textContent), so React can keep updating it later.
      const node = ref.current?.firstChild;
      if (node) node.nodeValue = formatRef.current(n);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      write(value);
      return;
    }

    const from = shown.current;
    write(from);
    let frame = 0;
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / DURATION_MS, 1);
      write(from + (value - from) * easeOutExpo(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  // React renders the final value (what screen readers announce); the layout effect then
  // animates the visible text up to it.
  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
