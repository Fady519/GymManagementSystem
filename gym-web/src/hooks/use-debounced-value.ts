"use client";

import { useEffect, useState } from "react";

/**
 * The value, but only after it stopped changing for `delayMs`.
 * Used for search boxes that live in component state (not the URL), so we send one request
 * when the user pauses typing instead of one per letter.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
