"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { ConsumptionBarChartProps } from "@/components/charts/consumption-bar-chart";

/**
 * recharts, loaded only on the resource pages that actually draw a chart.
 *
 * `ssr: false` keeps the library out of the server render entirely — it measures the DOM to
 * size itself, so a server-rendered pass would only be thrown away — and out of the shared
 * bundle the dashboard and auth screens pay for.
 */
const ConsumptionBarChart = dynamic(
  () => import("@/components/charts/consumption-bar-chart").then((m) => m.ConsumptionBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-xl" />,
  },
);

export function LazyConsumptionBarChart(props: ConsumptionBarChartProps) {
  return <ConsumptionBarChart {...props} />;
}
