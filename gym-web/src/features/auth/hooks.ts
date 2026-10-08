"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/features/auth/api";
import { areaOf } from "@/lib/roles";
import { clearSessionHint, setSessionHint } from "@/lib/session-hint";
import { sessionEnded, sessionStarted } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/store";
import type { AuthResponse } from "@/types";

/** The current session: status, user and the user's area (admin / trainer / member). */
export function useAuth() {
  const status = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);
  const endReason = useAppSelector((state) => state.auth.endReason);
  return { status, user, endReason, area: user ? areaOf(user.roles) : null };
}

/** Saves a session returned by login / register / change-password. */
export function useStartSession() {
  const dispatch = useAppDispatch();
  return useCallback(
    (auth: AuthResponse) => {
      setSessionHint(areaOf(auth.user.roles));
      dispatch(sessionStarted(auth));
    },
    [dispatch],
  );
}

/**
 * Logs out. Even if the API call fails (e.g. offline), we still forget the session in this browser.
 * The app shell sees the "logout" reason and takes the user to /login.
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearSessionHint();
      dispatch(sessionEnded("logout"));
      // Forget every cached response, so the next person on this computer can't see this user's data.
      queryClient.removeQueries();
    },
  });
}
