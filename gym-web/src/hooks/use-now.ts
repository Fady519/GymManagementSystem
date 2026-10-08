import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

// One shared timer for every component that shows the time: it ticks once a minute.
function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, MINUTE);
  return () => clearInterval(timer);
}
const currentMinute = () => Math.floor(Date.now() / MINUTE);
const noTimeOnServer = () => null;

/**
 * The current time, updated every minute, or null on the server and during hydration.
 *
 * Why null on the server: cached pages are built ahead of time, so a time read there would be
 * stale for every visitor (Next.js also reports it as an error). Components show a placeholder
 * while this is null and the real time-based text right after the page loads.
 */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, currentMinute, noTimeOnServer);
  return minute === null ? null : new Date(minute * MINUTE);
}
