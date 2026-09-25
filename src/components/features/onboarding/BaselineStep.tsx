"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Gauge, PiggyBank, ScanLine, Settings2, Sparkles } from "lucide-react";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { ProgressRing } from "@/components/savera/ProgressRing";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EyebrowPill } from "@/components/features/landing/primitives";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { useEnergyAnalysis } from "@/lib/api/hooks";
import { householdSavings, IMPACT_ANCHORS } from "@/lib/engine/impact";
import { formatINR, formatKwh, formatRange, formatRangeINR } from "@/lib/format";
import { monthLabel } from "@/lib/dates";
import { consumptionStatusLabel, consumptionStatusTone } from "@/types/common";
import type { Baseline, Household } from "@/types";
import { cn } from "@/lib/utils";
import { StepShell } from "./StepShell";
import { StatCell } from "./OnboardingPrimitives";
import type { FinishTarget, OnboardingSummary } from "./useOnboardingFlow";

export interface BaselineStepProps {
  household: Household;
  summary: OnboardingSummary;
  onFinish: (target: FinishTarget) => void;
}

type Phase = "computing" | "result";

/** Stage durations in ms (≈2.4 s total). */
const STAGE_MS = [560, 720, 560, 560] as const;

const BASELINE_KIND_LABEL: Record<Baseline["kind"], string> = {
  default: "Default baseline",
  personalized: "Personalised baseline",
  seasonal: "Personalised seasonal baseline",
};

/** Step 6 — animated "building" panel, then the engine-driven result card. */
export function BaselineStep({ household, summary, onFinish }: BaselineStepProps) {
  const analysis = useEnergyAnalysis(household.id);
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = React.useState<Phase>(reducedMotion ? "result" : "computing");
  const [stageIndex, setStageIndex] = React.useState(0);

  const billCount = analysis?.billCount ?? 0;
  const applianceCount = summary.applianceCount > 0 ? summary.applianceCount : (analysis?.current.estimates.length ?? 0);

  const stages = React.useMemo(
    () => [
      `Reconciling ${billCount} ${billCount === 1 ? "bill" : "bills"}`,
      `Disaggregating ${applianceCount} ${applianceCount === 1 ? "appliance" : "appliances"}`,
      `Comparing with Ward 24 peers (${IMPACT_ANCHORS.avgMonthlyKwh} kWh)`,
      "Ranking actions by ₹ impact",
    ],
    [applianceCount, billCount],
  );

  React.useEffect(() => {
    if (reducedMotion) {
      setStageIndex(STAGE_MS.length);
      setPhase("result");
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    let elapsed = 0;
    STAGE_MS.forEach((ms, i) => {
      elapsed += ms;
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setStageIndex(i + 1);
        }, elapsed),
      );
    });
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase("result");
      }, elapsed + 260),
    );
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reducedMotion]);

  const progress = Math.round((stageIndex / STAGE_MS.length) * 100);

  if (phase === "computing" || !analysis) {
    return (
      <StepShell
        eyebrow="Step 6 · Baseline"
        icon={Gauge}
        title="Building your baseline"
        description="A few seconds — every figure is computed from your bills, appliances and Ward 24 peers, never guessed."
      >
        <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center" aria-busy="true">
          <ProgressRing value={progress} size={104} strokeWidth={8} tone="normal" label="building" ariaLabel="Baseline build progress" />
          <ul className="space-y-2" aria-live="polite">
            {stages.map((label, i) => {
              const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-colors",
                    state === "done" && "text-positive",
                    state === "active" && "font-semibold text-foreground",
                    state === "pending" && "text-faint",
                  )}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : state === "active" ? (
                    <ScanLine className={cn("size-4 shrink-0 text-positive", !reducedMotion && "animate-pulse")} />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-border-strong" />
                  )}
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </StepShell>
    );
  }

  const { current, baseline, forecast, recommendations, confidence, detailScore } = analysis;
  const statusTone = consumptionStatusTone(current.status);
  const statusLabel = consumptionStatusLabel(current.status);
  const top = recommendations[0];
  const savings = householdSavings(current.actualKwh);
  const detailPct = Math.round(detailScore * 100);
  const baselineInputs = [`${billCount} ${billCount === 1 ? "bill" : "bills"}`, `${detailPct} % appliance detail`];

  const reveal = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div {...reveal}>
      <StepShell
        eyebrow="Step 6 · Baseline"
        eyebrowTone="positive"
        icon={CheckCircle2}
        title="Your baseline is ready"
        description={`${BASELINE_KIND_LABEL[baseline.kind]} for ${monthLabel(current.month)}, from ${billCount} ${
          billCount === 1 ? "bill" : "bills"
        } and ${applianceCount} appliances. Everything below is an estimate except your bill.`}
        headerAside={<EstimatedChip confidence={confidence} inputs={baselineInputs} />}
        footer={
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" onClick={() => onFinish("appliances")} className="w-full sm:w-auto">
                <Settings2 className="size-4" />
                Fine-tune appliances
              </Button>
              <Button type="button" variant="ghost" onClick={() => onFinish("scan")} className="w-full sm:w-auto">
                <ScanLine className="size-4" />
                Scan an appliance
              </Button>
            </div>
            <Button type="button" size="lg" onClick={() => onFinish("dashboard")} className="w-full sm:w-auto">
              Open my Electricity dashboard
              <ArrowRight className="size-4" />
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCell
            label="This month"
            value={formatKwh(current.actualKwh)}
            sub={current.bill !== undefined ? `${formatINR(current.bill)} billed` : monthLabel(current.month)}
            chip={<LabelChip kind="measured" size="sm" />}
          />
          <StatCell
            label="Baseline"
            value={formatRange(baseline.low, baseline.high, "kWh")}
            sub={BASELINE_KIND_LABEL[baseline.kind]}
            chip={<EstimatedChip size="sm" confidence={baseline.confidence} inputs={baselineInputs} />}
          />
          <StatCell
            label="Status"
            value={<StatusBadge tone={statusTone} label={statusLabel} />}
            sub="vs your baseline band"
          />
          <StatCell
            label={`Forecast · ${monthLabel(forecast.month)}`}
            value={formatRange(forecast.low, forecast.high, "kWh")}
            sub={formatRangeINR(forecast.billLow, forecast.billHigh)}
            chip={<EstimatedChip size="sm" confidence={forecast.confidence} inputs={forecast.inputs} />}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {top ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-stream-electricity/30 bg-stream-electricity/10 p-4 sm:p-5">
              <EyebrowPill tone="neutral" icon={Sparkles} className="border-stream-electricity/30 bg-card text-stream-electricity">
                Top recommendation
              </EyebrowPill>
              <div>
                <div className="text-base font-bold text-foreground">{top.title}</div>
                <p className="mt-1 text-sm text-soft">{top.action}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  may reduce {formatRange(top.kwhSavingLow, top.kwhSavingHigh, "kWh")} (
                  {formatRangeINR(top.rupeeLow, top.rupeeHigh)}) / month
                </p>
              </div>
              <EstimatedChip
                size="sm"
                confidence={confidence}
                inputs={["Appliance profile", "Demo tariff — configurable"]}
                className="mt-auto"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-positive/30 bg-positive/10 p-4 sm:p-5">
            <EyebrowPill tone="positive" icon={PiggyBank}>
              You could save
            </EyebrowPill>
            <div>
              <div className="font-display text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                {formatRangeINR(savings.rupeeLow, savings.rupeeHigh)}
                <span className="text-sm font-semibold text-soft"> / month</span>
              </div>
              <p className="mt-1 text-sm text-soft">
                {formatRangeINR(savings.yearlyRupeeLow, savings.yearlyRupeeHigh)} / year ·{" "}
                {formatRange(savings.kwhLow, savings.kwhHigh, "kWh")} a month at an{" "}
                {savings.reductionPctLow}–{savings.reductionPctHigh} % reduction.
              </p>
            </div>
            <EstimatedChip
              size="sm"
              confidence="Medium"
              inputs={[
                { label: "Reduction band", value: `${savings.reductionPctLow}–${savings.reductionPctHigh} % (estimated)` },
                { label: "This month", value: formatKwh(savings.monthlyKwh) },
                { label: "Tariff", value: "Demo tariff — configurable" },
              ]}
              className="mt-auto"
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Appliance-level figures are estimates reconciled to your meter reading; they are not measurements.
          Possible contributors to any change are listed on the dashboard — SAVERA never asserts a cause.
        </p>
      </StepShell>
    </motion.div>
  );
}
