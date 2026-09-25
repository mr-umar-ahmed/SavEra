"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";

import { useHasMounted } from "@/components/hooks/useHasMounted";
import type { Stream, Tone } from "@/types/common";

/** Status tone hex map — light "Earth" theme (ARCHITECTURE §2 hues, deepened for cream). */
export const TONE_HEX: Record<Tone, string> = {
  optimal: "#0E6F86",
  normal: "#2E7550",
  moderate: "#B06A12",
  critical: "#B0372A",
  unknown: "#8A8076",
};

/** Status tone hex map — dark "Espresso" theme. */
export const TONE_HEX_DARK: Record<Tone, string> = {
  optimal: "#4FCBDB",
  normal: "#5FC48D",
  moderate: "#EDAA45",
  critical: "#F07868",
  unknown: "#A09585",
};

/** Stream hex map — light theme. */
export const STREAM_HEX: Record<Stream, string> = {
  electricity: "#B06A12",
  water: "#1D6C9C",
  lpg: "#B23A4C",
};

/** Stream hex map — dark theme. */
export const STREAM_HEX_DARK: Record<Stream, string> = {
  electricity: "#EDAA45",
  water: "#62B9E6",
  lpg: "#F07F8F",
};

export interface GradientStop {
  offset: string;
  color: string;
  opacity: number;
}

export interface GradientSpec {
  id: string;
  /** `url(#id)` — pass as `fill`. */
  fill: string;
  stops: GradientStop[];
}

/**
 * Describes a vertical fade gradient for an area fill. Render it with
 * `<ChartDefs gradients={[spec]} />` inside the chart and use `spec.fill`.
 */
export function gradientDefs(
  id: string,
  color: string,
  opts: { from?: number; to?: number } = {},
): GradientSpec {
  const { from = 0.45, to = 0 } = opts;
  return {
    id,
    fill: `url(#${id})`,
    stops: [
      { offset: "0%", color, opacity: from },
      { offset: "100%", color, opacity: to },
    ],
  };
}

export interface ChartTheme {
  isDark: boolean;
  /** Grid line colour (dashed). */
  grid: string;
  /** Axis tick colour. */
  axis: string;
  /** Primary text on the chart surface (labels, tooltip values). */
  text: string;
  /** Muted text (tooltip captions, legends). */
  mutedText: string;
  /** Chart surface colour — used for 2px gaps between adjacent fills. */
  surface: string;
  /** Inline style for Recharts `contentStyle` / the themed tooltip wrapper. */
  tooltipStyle: CSSProperties;
  fontFamily: string;
  /** Brand primary (chocolate / caramel). */
  primary: string;
  /** Green secondary (comparison / positive series). */
  secondary: string;
  /** Neutral series (previous period, "other"). */
  neutral: string;
  /** Translucent band fill (baseline / forecast bands). */
  band: string;
  /** Cursor / crosshair colour. */
  cursor: string;
  tone: Record<Tone, string>;
  stream: Record<Stream, string>;
  gradientDefs: typeof gradientDefs;
}

const FONT = "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif";

/** Light "Earth" theme (default): cream surface, chocolate primary, forest green secondary. */
export const CHART_LIGHT: ChartTheme = {
  isDark: false,
  grid: "rgba(35,26,18,0.08)",
  axis: "#75665A",
  text: "#231A12",
  mutedText: "#665849",
  surface: "#FBF7F0",
  tooltipStyle: {
    background: "#FDFAF5",
    border: "1px solid #E3D7C5",
    borderRadius: 14,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: FONT,
    color: "#231A12",
    boxShadow: "0 18px 36px -18px rgba(58,38,20,0.3)",
  },
  fontFamily: FONT,
  primary: "#6B3D1C",
  secondary: "#2E6B4A",
  neutral: "rgba(35,26,18,0.22)",
  band: "rgba(46,107,74,0.14)",
  cursor: "rgba(35,26,18,0.2)",
  tone: TONE_HEX,
  stream: STREAM_HEX,
  gradientDefs,
};

/** Dark "Espresso" theme. */
export const CHART: ChartTheme = {
  isDark: true,
  grid: "rgba(244,235,221,0.07)",
  axis: "#9C8C78",
  text: "#F4EBDD",
  mutedText: "#B5A590",
  surface: "#201913",
  tooltipStyle: {
    background: "#231B15",
    border: "1px solid #33291F",
    borderRadius: 14,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: FONT,
    color: "#F4EBDD",
    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)",
  },
  fontFamily: FONT,
  primary: "#D49A62",
  secondary: "#7CC59A",
  neutral: "rgba(244,235,221,0.26)",
  band: "rgba(124,197,154,0.16)",
  cursor: "rgba(244,235,221,0.22)",
  tone: TONE_HEX_DARK,
  stream: STREAM_HEX_DARK,
  gradientDefs,
};

/**
 * Chart theme that follows `next-themes` (`resolvedTheme`). Returns the light
 * (default) theme until mounted so server and first client render agree.
 */
export function useChartTheme(): ChartTheme {
  const mounted = useHasMounted();
  const { resolvedTheme } = useTheme();
  if (!mounted) return CHART_LIGHT;
  return resolvedTheme === "dark" ? CHART : CHART_LIGHT;
}

/** Shared axis tick style. */
export function tickStyle(theme: ChartTheme): {
  fill: string;
  fontSize: number;
  fontFamily: string;
} {
  return { fill: theme.axis, fontSize: 13, fontFamily: theme.fontFamily };
}

/** Value → string with sensible decimals for tooltips and axis ticks. */
export function autoDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 0;
  if (abs < 10) return 2;
  if (abs < 100) return 1;
  return 0;
}
