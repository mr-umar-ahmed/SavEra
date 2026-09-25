import type { Stream, Tone } from "@/types/common";

/**
 * Literal Tailwind class strings per status tone. Tailwind v4 scans source for
 * class names, so these must stay literal (never template-built).
 */
export interface ToneClasses {
  /** Solid fill, e.g. dots and bars. */
  bg: string;
  /** Translucent surface tint (15 %). */
  bgSoft: string;
  /** Foreground text. */
  text: string;
  /** Translucent border (30 %). */
  border: string;
  /** Focus / glow ring. */
  ring: string;
}

export const TONE_CLASSES: Record<Tone, ToneClasses> = {
  optimal: {
    bg: "bg-tone-optimal",
    bgSoft: "bg-tone-optimal/15",
    text: "text-tone-optimal",
    border: "border-tone-optimal/30",
    ring: "ring-tone-optimal/40",
  },
  normal: {
    bg: "bg-tone-normal",
    bgSoft: "bg-tone-normal/15",
    text: "text-tone-normal",
    border: "border-tone-normal/30",
    ring: "ring-tone-normal/40",
  },
  moderate: {
    bg: "bg-tone-moderate",
    bgSoft: "bg-tone-moderate/15",
    text: "text-tone-moderate",
    border: "border-tone-moderate/30",
    ring: "ring-tone-moderate/40",
  },
  critical: {
    bg: "bg-tone-critical",
    bgSoft: "bg-tone-critical/15",
    text: "text-tone-critical",
    border: "border-tone-critical/30",
    ring: "ring-tone-critical/40",
  },
  unknown: {
    bg: "bg-tone-unknown",
    bgSoft: "bg-tone-unknown/15",
    text: "text-tone-unknown",
    border: "border-tone-unknown/30",
    ring: "ring-tone-unknown/40",
  },
};

/**
 * Hex per tone (ARCHITECTURE §2 hues, "Earth" light values). Prefer the
 * `tone-*` CSS utilities or `useChartTheme().tone`, which follow the theme.
 */
export const TONE_HEX: Record<Tone, string> = {
  optimal: "#0E6F86",
  normal: "#2E7550",
  moderate: "#B06A12",
  critical: "#B0372A",
  unknown: "#8A8076",
};

/** Hex per stream ("Earth" light values). Prefer `stream-*` utilities. */
export const STREAM_HEX: Record<Stream, string> = {
  electricity: "#B06A12",
  water: "#1D6C9C",
  lpg: "#B23A4C",
};

/** Tone-like class helpers per stream (same shape as `ToneClasses`). */
export const STREAM_CLASSES: Record<Stream, ToneClasses> = {
  electricity: {
    bg: "bg-stream-electricity",
    bgSoft: "bg-stream-electricity/15",
    text: "text-stream-electricity",
    border: "border-stream-electricity/30",
    ring: "ring-stream-electricity/40",
  },
  water: {
    bg: "bg-stream-water",
    bgSoft: "bg-stream-water/15",
    text: "text-stream-water",
    border: "border-stream-water/30",
    ring: "ring-stream-water/40",
  },
  lpg: {
    bg: "bg-stream-lpg",
    bgSoft: "bg-stream-lpg/15",
    text: "text-stream-lpg",
    border: "border-stream-lpg/30",
    ring: "ring-stream-lpg/40",
  },
};

export function toneClasses(tone: Tone): ToneClasses {
  return TONE_CLASSES[tone];
}

export function toneHex(tone: Tone): string {
  return TONE_HEX[tone];
}
