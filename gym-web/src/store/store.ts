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
 * so we never share one global store on the server: each render gets its own (see getStore).
 */
export function makeStore() {
  return configureStore({ reducer: rootReducer });
}

let browserStore: AppStore | undefined;

/**
 * The store to use: a fresh one on the server, but ONE per browser tab in the browser.
 *
 * Why one per tab: <Providers> lives in the [locale] layout. Switching language (/ar -> / -> /ar)
 * can leave two copies of that layout alive (Next.js keeps the previous page around for a fast "back").
 * If each copy had its own store, the API client could keep reading the token from the hidden copy
 * while the visible page saves the new session in the other one. Then the first requests after
 * register/login go out without a token and fail with 401. One shared store makes that impossible.
 */
export function getStore(): AppStore {
  if (typeof window === "undefined") return makeStore();
  browserStore ??= makeStore();
  return browserStore;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// Typed hooks: use these instead of the plain useDispatch/useSelector.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
