import { createSlice } from "@reduxjs/toolkit";

type UiState = {
  /** Mobile sidebar (opened from the menu button in the top bar). */
  sidebarOpen: boolean;
};

const initialState: UiState = {
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    sidebarToggled(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    sidebarClosed(state) {
      state.sidebarOpen = false;
    },
  },
});

export const { sidebarToggled, sidebarClosed } = uiSlice.actions;
export default uiSlice.reducer;
