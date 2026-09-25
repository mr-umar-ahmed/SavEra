"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";

/**
 * Slim top-of-page progress bar for client-side navigation.
 *
 * Starts when an internal link is activated (capture-phase click on an `<a>` with a
 * same-origin href, no modifier keys) and completes when `usePathname()` changes. Gives
 * immediate feedback while the App Router compiles or streams the next route, which is
 * what makes the demo feel instant even on a cold dev server.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const startedFor = React.useRef<string | null>(null);

  // Start on internal link activation.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePage) return; // hash links and re-clicks on the current page
      startedFor.current = url.pathname;
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the route actually changes.
  React.useEffect(() => {
    if (state !== "loading") return;
    setState("done");
    const t = window.setTimeout(() => setState("idle"), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Safety valve: never show a stuck bar (e.g. navigation cancelled).
  React.useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => setState("done"), 8000);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuetext={state === "done" ? "Loaded" : "Loading"}
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]"
    >
      <div
        className="h-full origin-left rounded-r-full bg-gradient-to-r from-primary via-positive to-primary shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
        style={{
          transform: state === "done" ? "scaleX(1)" : "scaleX(0.82)",
          opacity: state === "done" ? 0 : 1,
          transition: reduced
            ? "none"
            : state === "done"
              ? "transform 180ms ease-out, opacity 300ms ease-out 150ms"
              : "transform 6s cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      />
    </div>
  );
}
