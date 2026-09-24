"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query.
 *
 * `useSyncExternalStore` rather than `useEffect` + state so the server snapshot
 * is explicit (`false`): the first client paint matches the server HTML and
 * React never warns about a hydration mismatch, which a `window.matchMedia`
 * read during render would cause.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false),
    () => false,
  );
}

/** The app's one breakpoint: below it the tab bar and drawers take over. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
