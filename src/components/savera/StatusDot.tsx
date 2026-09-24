import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface StatusDotProps extends React.ComponentProps<"span"> {
  tone: Tone;
  /** Adds a soft pulsing halo (used for "active"/"live" states). */
  pulse?: boolean;
  size?: "sm" | "md";
}

/** Small coloured dot for a status tone. Decorative: always pair with a label. */
export function StatusDot({
  tone,
  pulse = false,
  size = "md",
  className,
  ...props
}: StatusDotProps) {
  const t = TONE_CLASSES[tone];
  const dim = size === "sm" ? "size-1.5" : "size-2";
  return (
    <span
      data-slot="status-dot"
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", dim, className)}
      {...props}
    >
      {pulse ? (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            t.bg,
          )}
        />
      ) : null}
      <span className={cn("relative inline-flex h-full w-full rounded-full", t.bg)} />
    </span>
  );
}
