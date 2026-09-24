import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, Shield } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { withAuth } from "@/lib/api.server";
import {
  getProfile,
  getSupervisorAnomalies,
  getSupervisorComparison,
  getSupervisorWards,
  getWardHeatmap,
} from "@/lib/endpoints";
import { formatNumber } from "@/lib/format";
import type { AnomalyWard, ComparisonWard, HeatmapResponse, SupervisorWard } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Supervisor" };

const RESOURCE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  lpg: "Cooking gas",
};

const RESOURCE_UNITS: Record<string, string> = {
  electricity: "kWh/30d",
  water: "L/day",
  lpg: "kg/30d",
};

/**
 * Supervisor dashboard: ward selection, resource heatmap, anomaly flags,
 * and ward comparison — all from ward_aggregates, never individual data.
 */
export default async function SupervisorPage() {
  const { profile, wards, anomalies, comparison } = await withAuth(async (ctx) => {
    const profile = await getProfile(ctx);

    // Gate: only supervisors and admins
    if (profile.role !== "supervisor" && profile.role !== "admin") {
      redirect("/");
    }

    const [wards, anomalies, comparison] = await Promise.all([
      getSupervisorWards(ctx),
      getSupervisorAnomalies(undefined, ctx),
      getSupervisorComparison("electricity", undefined, ctx),
    ]);

    return { profile, wards, anomalies, comparison };
  });

  // Get heatmap for first ward if available
  let heatmap: HeatmapResponse | null = null;
  if (wards.length > 0) {
    heatmap = await withAuth((ctx) => getWardHeatmap(wards[0]!.id, ctx));
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" aria-hidden />
          <h1 className="font-display text-3xl font-bold tracking-tight">Supervisor</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Anonymised ward-level data — never individual figures.
        </p>
      </header>

      {/* Wards overview */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Your wards"
      >
        <h2 className="mb-3 font-display text-base font-semibold">
          Wards in {profile.city}
        </h2>
        {wards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wards found for your city.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {wards.map((ward) => (
              <span
                key={ward.id}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium"
              >
                {ward.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Ward heatmap */}
      {heatmap && heatmap.resources.length > 0 ? (
        <section
          className="rounded-2xl border border-border bg-card p-4 shadow-card"
          aria-label="Resource heatmap"
        >
          <h2 className="mb-3 font-display text-base font-semibold">
            <BarChart3 className="mr-2 inline size-4 text-primary" aria-hidden />
            {heatmap.ward_name} — this month
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Resource</th>
                  <th className="pb-2 pr-4 text-right font-medium">Avg/household</th>
                  <th className="pb-2 pr-4 text-right font-medium">Households</th>
                  <th className="pb-2 pr-4 text-right font-medium">vs last month</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.resources.map((res) => (
                  <tr key={res.resource_type} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">
                      {RESOURCE_LABELS[res.resource_type] ?? res.resource_type}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {formatNumber(res.avg_consumption, 1)}{" "}
                      <span className="text-xs text-muted-foreground">
                        {RESOURCE_UNITS[res.resource_type]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {res.household_count}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {res.pct_change_vs_prev !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5",
                            res.pct_change_vs_prev > 0
                              ? "text-bad-fg"
                              : res.pct_change_vs_prev < 0
                                ? "text-good-fg"
                                : "text-muted-foreground",
                          )}
                        >
                          {res.pct_change_vs_prev > 0 ? (
                            <ArrowUp className="size-3" />
                          ) : res.pct_change_vs_prev < 0 ? (
                            <ArrowDown className="size-3" />
                          ) : null}
                          {formatNumber(Math.abs(res.pct_change_vs_prev), 1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {res.anomaly_flag ? (
                        <Badge className="gap-1 bg-bad-soft text-bad-fg">
                          <AlertTriangle className="size-3" aria-hidden />
                          Anomaly
                        </Badge>
                      ) : (
                        <Badge className="bg-good-soft text-good-fg">Normal</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Anomaly flags */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Anomaly flags"
      >
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
          <AlertTriangle className="size-4 text-warn-fg" aria-hidden />
          Anomaly flags this month
        </h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No wards flagged this month — all within the usual range.
          </p>
        ) : (
          <ul className="space-y-2">
            {anomalies.map((a, i) => (
              <li
                key={`${a.ward_id}-${a.resource_type}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{a.ward_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {RESOURCE_LABELS[a.resource_type] ?? a.resource_type} ·{" "}
                    {formatNumber(a.avg_consumption, 1)} avg
                    {a.pct_change_vs_prev !== null
                      ? ` · ${a.pct_change_vs_prev > 0 ? "+" : ""}${formatNumber(a.pct_change_vs_prev, 1)}% vs last month`
                      : ""}
                  </p>
                </div>
                <Badge className="shrink-0 gap-1 bg-bad-soft text-bad-fg">
                  <AlertTriangle className="size-3" aria-hidden />
                  Flagged
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ward comparison */}
      {comparison.length > 0 ? (
        <section
          className="rounded-2xl border border-border bg-card p-4 shadow-card"
          aria-label="Ward comparison"
        >
          <h2 className="mb-3 font-display text-base font-semibold">
            Electricity — ward comparison
          </h2>
          <div className="space-y-2">
            {comparison.map((ward) => {
              const max = Math.max(...comparison.map((w) => w.avg_per_household), 1);
              return (
                <div key={ward.ward_id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{ward.ward_name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatNumber(ward.avg_per_household, 1)} kWh/30d
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-electricity"
                      style={{
                        width: `${Math.max(2, (ward.avg_per_household / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ward.avg_per_person !== null
                      ? `${formatNumber(ward.avg_per_person, 1)} per person`
                      : ""}{" "}
                    · {ward.household_count} households
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            All figures are ward averages — no individual data is shown.
          </p>
        </section>
      ) : null}
    </div>
  );
}
