"use client";

import * as React from "react";
import { Download, Flame, Plus } from "lucide-react";
import { toast } from "sonner";

import type { Tone } from "@/types";
import { RangeBandChart } from "@/components/charts/RangeBandChart";
import { useChartTheme } from "@/components/charts/chartTheme";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { EmptyState } from "@/components/savera/EmptyState";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { useLpgHousehold } from "@/lib/api/hooks/lpg";
import { toCsv, downloadCsv } from "@/lib/csv";
import { LPG } from "@/data/catalogue/thresholds";
import { LPG_LOWER_FACTOR } from "@/lib/engine/lpg";
import { formatDate, formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIMITS = [3, 6, 12] as const;

interface HistoryRow {
  id: string;
  label: string;
  sizeKg: number;
  started: string;
  finished?: string;
  days: number;
  rate: number;
  estimatedRate: boolean;
  status: { label: string; tone: Tone };
}

export default function LpgHistoryPage() {
  const mounted = useHasMounted();
  const theme = useChartTheme();
  const { cylinders, analysis } = useLpgHousehold();
  const [limit, setLimit] = React.useState<(typeof LIMITS)[number]>(6);

  const rows: HistoryRow[] = React.useMemo(() => {
    const typical = analysis.typicalKgPerDay;
    const cycleById = new Map(analysis.cycles.map((c) => [c.cylinderId, c]));
    const statusOf = (rate: number): { label: string; tone: Tone } => {
      if (!typical) return { label: "Not enough data", tone: "unknown" };
      if (rate > typical * LPG.abnormalFactor) return { label: "Higher", tone: "moderate" };
      if (rate < typical * LPG_LOWER_FACTOR) return { label: "Lower", tone: "optimal" };
      return { label: "Normal", tone: "normal" };
    };
    const total = cylinders.length;
    return cylinders.map((c, i) => {
      const cycle = cycleById.get(c.id);
      const isCurrent = !c.finishDate && analysis.current?.cylinderId === c.id;
      const rate = cycle ? cycle.kgPerDay : isCurrent ? (analysis.current?.projectedKgPerDay ?? 0) : 0;
      return {
        id: c.id,
        label: `Cylinder ${total - i}`,
        sizeKg: c.sizeKg,
        started: c.startDate,
        finished: c.finishDate,
        days: cycle ? cycle.days : (analysis.current?.daysUsed ?? 0),
        rate,
        estimatedRate: !cycle,
        status: isCurrent ? { label: "In use", tone: "optimal" } : statusOf(rate),
      };
    });
  }, [cylinders, analysis]);

  if (!mounted) return <LpgSkeleton tiles={3} />;

  const visible = rows.slice(0, limit);
  const chartData = [...visible]
    .reverse()
    .filter((r) => r.rate > 0)
    .map((r) => ({
      x: r.finished ? `${formatDayMonth(r.started)}–${formatDayMonth(r.finished)}` : `${formatDayMonth(r.started)}–now`,
      actual: Number(r.rate.toFixed(3)),
      low: analysis.typicalRange?.low ?? r.rate,
      high: analysis.typicalRange?.high ?? r.rate,
    }));

  const exportCsv = () => {
    const csv = toCsv(visible, [
      { header: "Cylinder", value: (r) => r.label },
      { header: "Size (kg)", value: (r) => r.sizeKg },
      { header: "Started", value: (r) => r.started },
      { header: "Finished", value: (r) => r.finished ?? "in use" },
      { header: "Days", value: (r) => r.days },
      { header: "Rate (kg/day)", value: (r) => r.rate.toFixed(2) },
      { header: "Rate basis", value: (r) => (r.estimatedRate ? "estimated (in use)" : "from dates") },
      { header: "Status", value: (r) => r.status.label },
    ]);
    downloadCsv("savera-lpg-history.csv", csv);
    toast.success(`Exported ${visible.length} cylinders to CSV`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LPG"
        title="Usage History"
        description="Every cylinder you have tracked, newest first. Dates are measured; the rate of the cylinder in use is estimated."
        breadcrumbs={[{ label: "LPG", href: "/citizen/gas" }, { label: "Usage History" }]}
        chips={<EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} />}
        actions={
          rows.length > 0 ? (
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="size-4" />
              Export CSV
            </Button>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No cylinders yet — add your first cylinder to start tracking."
          action={{ label: "Add a cylinder", href: "/citizen/gas/cylinder", icon: Plus }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Show last cylinders">
            <span className="text-muted-foreground mr-1 text-sm">Show last</span>
            {LIMITS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={limit === l}
                onClick={() => setLimit(l)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
                  limit === l
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border-strong bg-card text-soft hover:bg-muted",
                )}
              >
                {l} cylinders
              </button>
            ))}
          </div>

          <section className="glass overflow-hidden rounded-2xl" aria-label="Cylinder history table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Cylinder</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Rate (kg/day)</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6">
                      <span className="text-foreground font-semibold">{r.label}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">{r.sizeKg} kg</span>
                    </TableCell>
                    <TableCell>{formatDate(r.started)}</TableCell>
                    <TableCell>{r.finished ? formatDate(r.finished) : <span className="text-muted-foreground">— in use</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.days}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.rate.toFixed(2)}
                      {r.estimatedRate ? <span className="text-faint ml-1 text-xs">est.</span> : null}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge tone={r.status.tone} label={r.status.label} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {chartData.length > 1 ? (
            <section className="glass space-y-4 rounded-2xl p-6" aria-labelledby="lpg-rate-trend">
              <div>
                <p className="eyebrow">Trend</p>
                <h2 id="lpg-rate-trend" className="font-display text-foreground mt-1 text-xl font-bold">
                  kg/day per cylinder vs your typical band
                </h2>
              </div>
              <RangeBandChart
                data={chartData}
                unit="kg/day"
                color={theme.stream.lpg}
                labels={{ actual: "Rate per cylinder", band: "Typical band" }}
                height={260}
                ariaLabel="LPG consumption rate per cylinder compared with the typical band"
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
