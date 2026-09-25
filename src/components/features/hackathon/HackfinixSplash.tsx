"use client";

import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HackfinixContent } from "./HackfinixContent";

/** Session-scoped flag so the splash shows once per browser tab, not on every visit. */
export const HACKFINIX_SPLASH_KEY = "savera-hackfinix-splash-seen";

function hasSeenSplash(): boolean {
  try {
    return sessionStorage.getItem(HACKFINIX_SPLASH_KEY) === "1";
  } catch {
    return true;
  }
}

function markSplashSeen(): void {
  try {
    sessionStorage.setItem(HACKFINIX_SPLASH_KEY, "1");
  } catch {
    /* storage unavailable — nothing to persist */
  }
}

interface HackfinixSplashProps {
  /** Milliseconds to wait after mount before opening (lets the hero paint first). */
  delayMs?: number;
}

/**
 * "Made for HACKFINIX 2026" welcome dialog for the landing page. Opens once per
 * browser session after a short delay; closing it (button, overlay, Esc) records the
 * dismissal so it never interrupts the demo again in that session.
 */
export function HackfinixSplash({ delayMs = 700 }: HackfinixSplashProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (hasSeenSplash()) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) markSplashSeen();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="overflow-hidden border-border-strong bg-popover p-7 sm:max-w-md sm:p-9"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <HackfinixContent />
      </DialogContent>
    </Dialog>
  );
}
