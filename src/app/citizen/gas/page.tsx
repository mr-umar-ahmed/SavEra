"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Cylinder, Flame, Gauge, History, Plus, Timer } from "lucide-react";

import { useHasMounted } from "@/components/hooks/useHasMounted";
import { AlertBanner } from "@/components/savera/AlertBanner";
import { EmptyState } from "@/components/savera/EmptyState";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { KpiCard } from "@/components/savera/KpiCard";
import { LabelChip } from "@/components/savera/LabelChip";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/features/lpg/BookingTracker";
import { CurrentCylinderCard } from "@/components/features/lpg/CurrentCylinderCard";
import { LpgCycleChart } from "@/components/features/lpg/LpgCycleChart";
import { LpgInsightCard } from "@/components/features/lpg/LpgInsightCard";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { RefillPredictionCard } from "@/components/features/lpg/RefillPredictionCard";
import { useLpgHousehold } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { GasSupplyAnomalySimulator } from "@/components/gas/GasSupplyAnomalySimulator";
import { formatDate, formatDayMonth, formatDays, formatKg } from "@/lib/format";

const rate = (n?: number) => (n === undefined ? "—" : `${n.toFixed(2)} kg/day`);

export default function CitizenLpgDashboard() {
  const mounted = useHasMounted();
  const view = useLpgHousehold();
  const { analysis, openCylinder, householdId } = view;

  // Raise the higher-consumption notification once per cylinder (idempotent in the API).
  React.useEffect(() => {
    if (mounted && analysis.status === "higher") {
      void lpgApi.notifyHigherConsumption(householdId, analysis.deltaPct ?? 0);
    }
  }, [mounted, analysis.status, analysis.deltaPct, householdId]);

  const [viewMode, setViewMode] = React.useState<"smart_twin" | "tracker">("smart_twin");

  if (!mounted) return <LpgSkeleton />;

  const current = analysis.current;
  const previous = analysis.cycles.at(-1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LPG & Piped Gas"
        title="Your Gas Supply & Smart Metering"
        description="Monitor smart ultrasonic gas telemetry, track cylinder refills, prevent pipeline leak risks, and inspect live 3D meter-to-meter distribution."
        chips={
          <>
            <EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} />
            {view.household?.gas?.provider ? (
              <span className="bg-secondary border-border text-soft rounded-full border px-3 py-1 font-mono text-xs">
                {view.household.gas.provider}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/citizen/gas/history">
                <History className="size-4" />
                Usage History
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/citizen/gas/cylinder">
                <Cylinder className="size-4" />
                Update Cylinder
              </Link>
            </Button>
          </>
        }
      />

      {/* View Switcher: Smart 3D Gas Twin vs Traditional Cylinder Tracker */}
      <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setViewMode("smart_twin")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            viewMode === "smart_twin"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="size-3.5 text-amber-500" />
          <span>Smart Gas Meter & 3D Network Twin</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("tracker")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            viewMode === "tracker"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cylinder className="size-3.5 text-soft" />
          <span>Cylinder & Refill Tracker</span>
        </button>
      </div>

      {viewMode === "smart_twin" ? (
        <GasSupplyAnomalySimulator mode="citizen" />
      ) : (
        <>
          {view.officialAlert ? <AlertBanner alert={view.officialAlert} /> : null}

      {!openCylinder && analysis.cycles.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No cylinders yet — add your first cylinder to start tracking."
          description="SAVERA learns your typical LPG use from the dates you start and finish each cylinder."
          action={{ label: "Add a cylinder", href: "/citizen/gas/cylinder", icon: Plus }}
          secondaryAction={{ label: "Gas & Heating setup", href: "/citizen/setup/gas" }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Current cylinder"
              value={openCylinder ? formatKg(openCylinder.sizeKg) : "None in use"}
              sub={openCylinder ? `Started ${formatDate(openCylinder.startDate)}` : "Add the cylinder you are using"}
              icon={Cylinder}
              tone="normal"
              footer={openCylinder ? <LabelChip kind="measured" size="sm" /> : undefined}
            />
            <KpiCard
              label="Estimated remaining"
              value={current ? `~${formatDays(current.estimatedRemainingDays)}` : "—"}
              sub={current ? `~${formatKg(current.estimatedRemainingKg)} left · ${formatDays(current.daysUsed)} used` : undefined}
              icon={Timer}
              tone={current && current.estimatedRemainingDays <= 3 ? "critical" : "moderate"}
              estimated
              confidence={analysis.confidence}
              inputs={analysis.inputs}
            />
            <KpiCard
              label="Average consumption"
              value={rate(analysis.currentKgPerDay)}
              sub={
                analysis.typicalRange
                  ? `Typical ${analysis.typicalRange.low.toFixed(2)}–${analysis.typicalRange.high.toFixed(2)} kg/day`
                  : "Typical rate not learned yet"
              }
              icon={Gauge}
              tone={analysis.status === "higher" ? "critical" : "normal"}
              estimated
              confidence={analysis.confidence}
              inputs={analysis.inputs}
            />
            <KpiCard
              label="Next expected refill"
              value={analysis.refill ? `~${formatDayMonth(analysis.refill.date)}` : "—"}
              sub={
                view.refillWindow
                  ? `Window ${formatDayMonth(view.refillWindow.earliest)} – ${formatDayMonth(view.refillWindow.latest)}`
                  : undefined
              }
              icon={CalendarClock}
              tone="optimal"
              estimated
              confidence={analysis.confidence}
              inputs={analysis.inputs}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              {openCylinder ? (
                <CurrentCylinderCard analysis={analysis} cylinder={openCylinder} usedPct={view.usedPct} />
              ) : (
                <EmptyState
                  icon={Cylinder}
                  title="No cylinder in use"
                  description="Add the cylinder you connected most recently to keep predictions accurate."
                  action={{ label: "Add new cylinder", href: "/citizen/gas/cylinder" }}
                  className="glass h-full rounded-2xl"
                />
              )}
            </div>
            <LpgInsightCard analysis={analysis} className="lg:col-span-3" />
          </div>

          <section id="usage" className="glass scroll-mt-28 space-y-5 rounded-2xl p-6" aria-labelledby="lpg-usage-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">My LPG usage</p>
                <h2 id="lpg-usage-title" className="font-display text-foreground mt-1 text-xl font-bold">
                  Consumption per cylinder
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Rates are estimated from cylinder dates; the dates themselves are measured.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/citizen/gas/history">Full history</Link>
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <UsageStat label="Current rate" value={rate(analysis.currentKgPerDay)} estimated />
              <UsageStat
                label="Current cycle"
                value={current ? formatDays(current.daysUsed) : "—"}
                hint={current ? "in progress" : undefined}
              />
              <UsageStat label="Previous cylinder" value={previous ? formatDays(previous.days) : "—"} />
              <UsageStat
                label="Typical per cylinder"
                value={analysis.typicalDaysPerCylinder ? formatDays(analysis.typicalDaysPerCylinder) : "—"}
                estimated
              />
            </dl>
            {analysis.cycles.length > 0 || current ? <LpgCycleChart analysis={analysis} /> : null}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RefillPredictionCard view={view} />
            <BookingTracker
              booking={view.activeBooking ?? view.lastBooking}
              inUseSince={openCylinder?.startDate}
            />
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

function UsageStat({
  label,
  value,
  hint,
  estimated,
}: {
  label: string;
  value: string;
  hint?: string;
  estimated?: boolean;
}) {
  return (
    <div className="bg-muted border-border rounded-xl border p-4">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {label}
        {estimated ? <span className="text-faint font-mono text-2xs uppercase">est.</span> : null}
      </dt>
      <dd className="font-display text-foreground mt-1 text-xl font-bold">{value}</dd>
      {hint ? <dd className="text-muted-foreground text-xs">{hint}</dd> : null}
    </div>
  );
}
