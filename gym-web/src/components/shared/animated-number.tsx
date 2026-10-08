"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en");

/**
 * A number that counts up to its value (and glides to new values when the data refreshes).
 * The text is written straight into the element on each animation frame, so React doesn't
 * re-render 60 times a second. People who prefer reduced motion get the final value at once.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const formatRef = useRef(format);
  const reduceMotion = useReducedMotion();

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
    if (reduceMotion) {
      write(value);
      return;
    }
    write(shown.current);
    const controls = animate(shown.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  // React renders the final value (what screen readers announce); the layout effect then
  // animates the visible text up to it.
  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
