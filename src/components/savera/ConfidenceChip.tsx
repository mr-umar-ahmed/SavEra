import * as React from "react";

import { cn } from "@/lib/utils";
import { confidenceTone, type ConfidenceLevel } from "@/types/common";

import { StatusDot } from "./StatusDot";
import { TONE_CLASSES } from "./tone";

export interface ConfidenceChipProps extends React.ComponentProps<"span"> {
  level: ConfidenceLevel;
  size?: "sm" | "md";
}

/** `High confidence` / `Medium confidence` / `Low confidence` chip (emerald / amber / grey). */
export function ConfidenceChip({ level, size = "md", className, ...props }: ConfidenceChipProps) {
  const tone = confidenceTone(level);
  const t = TONE_CLASSES[tone];
  return (
    <span
      data-slot="confidence-chip"
      role="status"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        t.bgSoft,
        t.text,
        t.border,
        className,
      )}
      {...props}
    >
      <StatusDot tone={tone} size={size} />
      {level} confidence
    </span>
  );
}
