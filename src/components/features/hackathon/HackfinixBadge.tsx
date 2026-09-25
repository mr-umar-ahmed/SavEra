"use client";

import * as React from "react";
import { Trophy } from "lucide-react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HACKATHON, HackfinixContent } from "./HackfinixContent";

export interface HackfinixBadgeProps extends Omit<React.ComponentProps<"button">, "children"> {
  /**
   * `pill` — full line "Made for HACKFINIX 2026 · Cambridge North Campus, Bangalore" (footers).
   * `compact` — "HACKFINIX 2026" only (sidebar, tight headers).
   */
  variant?: "pill" | "compact";
  /** Hide the "Start the demo" link inside the dialog (portals are already signed in). */
  showDemoLink?: boolean;
}

/**
 * Always-visible "Made for HACKFINIX 2026" badge. Clicking it re-opens the same dialog
 * the landing page shows on first visit, so judges can find the credit from any screen.
 */
export function HackfinixBadge({ variant = "pill", showDemoLink = true, className, ...props }: HackfinixBadgeProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${HACKATHON.line} — about this build`}
          className={cn(
            "group inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/5 font-mono font-semibold text-primary outline-none transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            variant === "pill" ? "px-3 py-1.5 text-2xs tracking-[0.12em] uppercase" : "px-2.5 py-1 text-2xs tracking-[0.1em] uppercase",
            className,
          )}
          {...props}
        >
          <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-2.5" aria-hidden />
          </span>
          {variant === "pill" ? (
            <span className="min-w-0 truncate">
              Made for {HACKATHON.event}
              <span className="hidden sm:inline">
                {" "}
                · {HACKATHON.venue}, {HACKATHON.city}
              </span>
            </span>
          ) : (
            <span className="truncate">{HACKATHON.event}</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="overflow-hidden border-border-strong bg-popover p-7 sm:max-w-md sm:p-9"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <HackfinixContent showDemoLink={showDemoLink} />
      </DialogContent>
    </Dialog>
  );
}
