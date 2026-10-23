"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny observable for values that only exist in the browser (localStorage,
 * DOM attributes, feature detection). Server rendering and hydration use the
 * fallback, then React switches to the real value without a mismatch.
 */
export function createBrowserValue<T>(read: () => T, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { value: T } | null = null;
  const get = () => {
    if (!cache) {
      try {
        cache = { value: read() };
      } catch {
        cache = { value: fallback };
      }
    }
    return cache.value;
  };
  const notify = () => {
    cache = null;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = () => notify();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  return {
    notify,
    get,
    use: () => useSyncExternalStore(subscribe, get, () => fallback),
  };
}

const noopSubscribe = () => () => {};

/** A browser-only constant such as feature detection; `fallback` during SSR. */
export function useBrowserConstant<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => fallback);
}
