"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/api-client";
import { readSessionHint } from "@/lib/session-hint";
import { sessionEnded } from "@/store/authSlice";
import { useAppDispatch } from "@/store/store";

/**
 * Runs once when the app opens in the browser and restores the session after a page reload.
 * The access token lives in memory only, so a reload loses it. If the hint cookie says this browser
 * has a session, we ask the API for a new access token using the httpOnly refresh cookie.
 * Visitors who never logged in skip the call entirely.
 */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (readSessionHint()) {
      // refreshSession updates the store itself (and is safe if React runs this effect twice).
      void refreshSession();
    } else {
      dispatch(sessionEnded());
    }
  }, [dispatch]);

  return null;
}
