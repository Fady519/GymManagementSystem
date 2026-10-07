import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import authReducer from "@/store/authSlice";
import uiReducer from "@/store/uiSlice";

// Built once when the file is imported. combineReducers uses Math.random() internally,
// and Next.js doesn't allow random values while it prerenders a page, so it must not run inside a component.
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});

/**
 * Creates a new store. Next.js renders on the server for many users at once,
 * so we never share one global store: <Providers> (app/providers.tsx) creates one per browser tab.
 */
export function makeStore() {
  return configureStore({ reducer: rootReducer });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// Typed hooks: use these instead of the plain useDispatch/useSelector.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
