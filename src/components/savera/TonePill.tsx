import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface TonePillProps extends React.ComponentProps<"span"> {
  tone: Tone;
  icon?: LucideIcon;
  size?: "sm" | "md";
}

/** Tone-tinted pill without a status dot; pass an icon or text children. */
export function TonePill({
  tone,
  icon: Icon,
  size = "md",
  className,
  children,
  ...props
}: TonePillProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      data-slot="tone-pill"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        t.bgSoft,
        t.text,
        t.border,
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3" /> : null}
      {children}
    </span>
  );
}
