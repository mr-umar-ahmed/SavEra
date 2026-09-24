"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ConsumptionPoint {
  /** Short axis label, e.g. "Aug". */
  label: string;
  value: number;
}

export interface ConsumptionBarChartProps {
  data: ConsumptionPoint[];
  /** The household's usual, drawn as a reference line when known. */
  baseline?: number | null;
  /** Bars above this are drawn in the "over" colour. */
  upperThreshold?: number | null;
  unit: string;
  accent?: "electricity" | "water";
  /** Explicit height keeps ResponsiveContainer measurable in jsdom tests. */
  height?: number;
  className?: string;
}

const ACCENT_FILL = {
  electricity: "var(--electricity)",
  water: "var(--water)",
} as const;

/**
 * Last-N-periods consumption with the baseline drawn across it (SPEC Phase 3: "Bar chart:
 * last 6 months consumption vs baseline line").
 *
 * Bars over the anomaly threshold switch to the "bad" colour *and* the tooltip says so, so
 * the information is never carried by colour alone.
 */
export function ConsumptionBarChart({
  data,
  baseline,
  upperThreshold,
  unit,
  accent = "electricity",
  height = 220,
  className,
}: ConsumptionBarChartProps) {
  if (data.length === 0) {
    return (
      <p className={cn("py-10 text-center text-sm text-muted-foreground", className)}>
        No readings yet — add one to see your history here.
      </p>
    );
  }

  const fill = ACCENT_FILL[accent];
  const isOver = (value: number) => upperThreshold != null && value > upperThreshold;

  return (
    <div className={className} style={{ width: "100%", height }} data-testid="consumption-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            formatter={(value: any) => [
              `${formatNumber(Number(value ?? 0))} ${unit}${isOver(Number(value ?? 0)) ? " — above your usual" : ""}`,
              "",
            ]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          {baseline != null ? (
            <ReferenceLine
              y={baseline}
              stroke="var(--primary)"
              strokeDasharray="5 4"
              label={{
                value: "your usual",
                position: "insideTopRight",
                fill: "var(--primary)",
                fontSize: 11,
              }}
            />
          ) : null}
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((point) => (
              <Cell key={point.label} fill={isOver(point.value) ? "var(--bad)" : fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
