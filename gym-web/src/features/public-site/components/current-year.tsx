"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The current year for the footer. It's a client component because the home page is cached on
 * the server: a year written at build time would stay wrong after New Year until the next build.
 */
export function CurrentYear({ fallback }: { fallback: number }) {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => fallback,
  );
  return <>{year}</>;
}
