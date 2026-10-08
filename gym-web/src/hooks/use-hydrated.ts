import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false on the server and during hydration, true right after.
 *
 * Why: Next.js hydrates a page in pieces. The session check (AuthBootstrap) can finish before
 * a later piece (e.g. the header) hydrates. If that piece already showed "Log in" while the server
 * HTML had a placeholder, React reports a hydration mismatch. Components that depend on the
 * session render the server version until this returns true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
