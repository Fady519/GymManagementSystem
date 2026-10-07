import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** The logged-in user, as returned by /api/auth/login and /api/auth/me. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

type AuthState = {
  user: AuthUser | null;
  /** Short-lived JWT. Kept in memory only (never localStorage), so a script can't steal it from storage. */
  accessToken: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loggedIn(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { loggedIn, tokenRefreshed, loggedOut } = authSlice.actions;
export default authSlice.reducer;
