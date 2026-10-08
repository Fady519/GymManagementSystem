import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, CurrentUserResponse } from "@/types";

/**
 * - "unknown": the app just loaded and is still checking if there is a session (silent refresh).
 * - "authenticated": we have a user and an access token.
 * - "anonymous": nobody is logged in.
 */
export type AuthStatus = "unknown" | "authenticated" | "anonymous";

/** Why the session ended. The app shell uses it to pick the right message on the login page. */
export type SessionEndReason = "logout" | "expired";

type AuthState = {
  status: AuthStatus;
  user: CurrentUserResponse | null;
  /** Short-lived JWT (15 minutes). Kept in memory only (never localStorage), so a script can't steal it from storage. */
  accessToken: string | null;
  endReason: SessionEndReason | null;
};

const initialState: AuthState = {
  status: "unknown",
  user: null,
  accessToken: null,
  endReason: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Login, register, refresh and change-password all return the same AuthResponse. */
    sessionStarted(state, action: PayloadAction<AuthResponse>) {
      state.status = "authenticated";
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.endReason = null;
    },
    sessionEnded(state, action: PayloadAction<SessionEndReason | undefined>) {
      state.status = "anonymous";
      state.user = null;
      state.accessToken = null;
      state.endReason = action.payload ?? null;
    },
  },
});

export const { sessionStarted, sessionEnded } = authSlice.actions;
export default authSlice.reducer;
