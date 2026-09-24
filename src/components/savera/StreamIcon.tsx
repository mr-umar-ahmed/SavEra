import * as React from "react";
import { Droplets, Flame, Zap, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { STREAM_LABEL, type Stream } from "@/types/common";

import { STREAM_CLASSES, STREAM_HEX, type ToneClasses } from "./tone";

export const STREAM_ICON: Record<Stream, LucideIcon> = {
  electricity: Zap,
  water: Droplets,
  lpg: Flame,
};

/** Tone-like colour class helpers for a stream (`text`, `bg`, `bgSoft`, `border`, `ring`). */
export function streamTone(stream: Stream): ToneClasses {
  return STREAM_CLASSES[stream];
}

/** `electricity` → `Electricity`, `lpg` → `LPG`. */
export function streamLabel(stream: Stream): string {
  return STREAM_LABEL[stream];
}

/** Stream hex colour (amber / sky / rose). */
export function streamColor(stream: Stream): string {
  return STREAM_HEX[stream];
}

export interface StreamIconProps extends Omit<React.ComponentProps<"span">, "children"> {
  stream: Stream;
  /** `plain` renders just the icon; `tile` wraps it in a tinted rounded square. */
  variant?: "plain" | "tile";
  size?: "sm" | "md" | "lg";
  /** Adds a visually-hidden stream name for screen readers (default: decorative). */
  labelled?: boolean;
}

const ICON_SIZE = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;
const TILE_SIZE = {
  sm: "size-7 rounded-lg",
  md: "size-9 rounded-xl",
  lg: "size-11 rounded-2xl",
} as const;

/** Lucide icon for a stream in the stream colour, optionally on a tinted tile. */
export function StreamIcon({
  stream,
  variant = "plain",
  size = "md",
  labelled = false,
  className,
  ...props
}: StreamIconProps) {
  const Icon = STREAM_ICON[stream];
  const t = STREAM_CLASSES[stream];
  const icon = <Icon aria-hidden="true" className={cn(ICON_SIZE[size], t.text)} />;

  if (variant === "plain") {
    return (
      <span
        data-slot="stream-icon"
        className={cn("inline-flex shrink-0 items-center", className)}
        {...props}
      >
        {icon}
        {labelled ? <span className="sr-only">{STREAM_LABEL[stream]}</span> : null}
      </span>
    );
  }

  return (
    <span
      data-slot="stream-icon"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        TILE_SIZE[size],
        t.bgSoft,
        t.border,
        className,
      )}
      {...props}
    >
      {icon}
      {labelled ? <span className="sr-only">{STREAM_LABEL[stream]}</span> : null}
    </span>
  );
}
