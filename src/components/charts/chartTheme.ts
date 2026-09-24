"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";

import { useHasMounted } from "@/components/hooks/useHasMounted";
import type { Stream, Tone } from "@/types/common";

/** Status tone hex map (ARCHITECTURE §2). */
export const TONE_HEX: Record<Tone, string> = {
  optimal: "#22D3EE",
  normal: "#10B981",
  moderate: "#F59E0B",
  critical: "#EF4444",
  unknown: "#6B7280",
};

/** Stream hex map (ARCHITECTURE §2). */
export const STREAM_HEX: Record<Stream, string> = {
  electricity: "#F59E0B",
  water: "#38BDF8",
  lpg: "#F43F5E",
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
  /** Emerald primary. */
  primary: string;
  /** Blue secondary (authority / comparison series). */
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

const FONT = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

/** Dark theme (default). */
export const CHART: ChartTheme = {
  isDark: true,
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.45)",
  text: "#FFFFFF",
  mutedText: "rgba(255,255,255,0.5)",
  surface: "#0A0F0D",
  tooltipStyle: {
    background: "#050B08",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: "8px 12px",
    fontSize: 12,
    fontFamily: FONT,
    color: "#FFFFFF",
    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)",
  },
  fontFamily: FONT,
  primary: "#10B981",
  secondary: "#3B82F6",
  neutral: "rgba(255,255,255,0.28)",
  band: "rgba(16,185,129,0.18)",
  cursor: "rgba(255,255,255,0.25)",
  tone: TONE_HEX,
  stream: STREAM_HEX,
  gradientDefs,
};

/** Light theme variant (tokens flip; accents stay). */
export const CHART_LIGHT: ChartTheme = {
  ...CHART,
  isDark: false,
  grid: "rgba(11,18,16,0.08)",
  axis: "rgba(11,18,16,0.5)",
  text: "#0B1210",
  mutedText: "#5B6660",
  surface: "#FFFFFF",
  tooltipStyle: {
    ...CHART.tooltipStyle,
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    color: "#0B1210",
    boxShadow: "0 20px 40px -20px rgba(11,18,16,0.25)",
  },
  primary: "#059669",
  neutral: "rgba(11,18,16,0.22)",
  band: "rgba(5,150,105,0.16)",
  cursor: "rgba(11,18,16,0.25)",
};

/**
 * Chart theme that follows `next-themes` (`resolvedTheme`). Returns the dark
 * theme until mounted so server and first client render agree.
 */
export function useChartTheme(): ChartTheme {
  const mounted = useHasMounted();
  const { resolvedTheme } = useTheme();
  if (!mounted) return CHART;
  return resolvedTheme === "light" ? CHART_LIGHT : CHART;
}

/** Shared axis tick style. */
export function tickStyle(theme: ChartTheme): {
  fill: string;
  fontSize: number;
  fontFamily: string;
} {
  return { fill: theme.axis, fontSize: 12, fontFamily: theme.fontFamily };
}

/** Value → string with sensible decimals for tooltips and axis ticks. */
export function autoDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 0;
  if (abs < 10) return 2;
  if (abs < 100) return 1;
  return 0;
}
