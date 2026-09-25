"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";

import type { LpgAnalysis, Tone } from "@/types";
import { LPG_STATUS_LABEL } from "@/types";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { TONE_CLASSES } from "@/components/savera/tone";
import { Button } from "@/components/ui/button";
import { formatDays } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SafetyGuidanceSheet } from "./SafetyGuidanceSheet";

export function lpgStatusTone(a: LpgAnalysis): Tone {
  switch (a.status) {
    case "higher":
      return (a.deltaPct ?? 0) >= 35 ? "critical" : "moderate";
    case "lower":
      return "optimal";
    case "normal":
      return "normal";
    default:
      return "unknown";
  }
}

const kg2 = (n?: number) => (n === undefined ? "—" : n.toFixed(2));

/** AI Consumption Insight (spec 03 §5). Possibilities only — never a cause. */
export function LpgInsightCard({ analysis, className }: { analysis: LpgAnalysis; className?: string }) {
  const tone = lpgStatusTone(analysis);
  const typical = analysis.typicalRange;
  const current = analysis.current;
  const expectedRemaining =
    current && analysis.typicalKgPerDay
      ? Math.max(0, Math.round(current.sizeKg / analysis.typicalKgPerDay) - current.daysUsed)
      : undefined;
  const Icon =
    analysis.status === "higher"
      ? AlertTriangle
      : analysis.status === "lower"
        ? TrendingDown
        : analysis.status === "normal"
          ? CheckCircle2
          : HelpCircle;

  return (
    <section
      id="insight"
      className={cn(
        "glass scroll-mt-28 flex flex-col gap-4 rounded-2xl p-6",
        analysis.status === "higher" && "border-tone-moderate/40",
        className,
      )}
      aria-labelledby="lpg-insight-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-2">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI Consumption Insight
        </p>
        <EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} size="sm" />
      </div>

      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border",
            TONE_CLASSES[tone].bgSoft,
            TONE_CLASSES[tone].border,
            TONE_CLASSES[tone].text,
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <StatusBadge
            tone={tone}
            label={
              analysis.status === "higher"
                ? `⚠️ ${LPG_STATUS_LABEL.higher}`
                : LPG_STATUS_LABEL[analysis.status]
            }
          />
          <h2 id="lpg-insight-title" className="font-display text-foreground mt-2 text-lg font-bold">
            {analysis.status === "higher"
              ? "Your current cylinder is being used faster than your typical pattern."
              : analysis.status === "lower"
                ? "Your current cylinder is lasting longer than your typical pattern."
                : analysis.status === "normal"
                  ? "Your LPG use is within your usual range."
                  : "Not enough history yet to learn your typical usage."}
          </h2>
        </div>
      </div>

      {analysis.status === "insufficient_data" ? (
        <p className="text-soft text-sm leading-relaxed">
          Mark at least one cylinder as finished and SAVERA will learn your typical consumption and
          start flagging unusual changes.
        </p>
      ) : (
        <p className="text-soft text-sm leading-relaxed">
          Your typical consumption is{" "}
          <strong className="text-foreground">
            ~{kg2(typical?.low)}–{kg2(typical?.high)} kg/day
          </strong>
          . The current cylinder is tracking at{" "}
          <strong className="text-foreground">{kg2(analysis.currentKgPerDay)} kg/day</strong>
          {analysis.status === "normal" ? ", within your usual range." : "."}
        </p>
      )}

      {analysis.status === "higher" && current ? (
        <dl className="bg-muted border-border grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4">
          <Stat label="Typical" value={`${kg2(analysis.typicalKgPerDay)} kg/day`} />
          <Stat label="Current" value={`${kg2(analysis.currentKgPerDay)} kg/day`} tone="critical" />
          <Stat label="Change" value={`+${Math.round(analysis.deltaPct ?? 0)} %`} tone="critical" />
          <Stat
            label="Remaining"
            value={`~${formatDays(current.estimatedRemainingDays)}`}
            hint={expectedRemaining !== undefined ? `vs ~${formatDays(expectedRemaining)} expected` : undefined}
          />
        </dl>
      ) : null}

      {analysis.possibleReasons.length > 0 ? (
        <div>
          <p className="text-foreground text-sm font-semibold">Possible reasons</p>
          <ul className="mt-2 space-y-1.5">
            {analysis.possibleReasons.map((r) => (
              <li
                key={r}
                className={cn(
                  "flex gap-2 text-sm",
                  r.toLowerCase().includes("leakage") ? "text-tone-critical font-semibold" : "text-soft",
                )}
              >
                <span aria-hidden="true">•</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">
            These are possibilities, not a diagnosis — SAVERA does not detect leaks or faults.
          </p>
        </div>
      ) : null}

      {analysis.status === "normal" || analysis.status === "lower" ? (
        <div className="bg-muted border-border rounded-xl border p-4">
          <p className="text-foreground text-sm font-semibold">Keep it efficient</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {analysis.guidance.slice(2, 6).map((g) => (
              <li key={g} className="text-soft flex gap-2 text-sm">
                <span className="text-positive" aria-hidden="true">
                  ✓
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto pt-1">
        <SafetyGuidanceSheet
          trigger={
            <Button variant={analysis.status === "higher" ? "default" : "outline"} size="sm" className="gap-2">
              <ShieldCheck className="size-4" />
              Conservation &amp; Safety Guidance
            </Button>
          }
        />
      </div>
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: Tone }) {
  return (
    <div>
      <dt className="text-muted-foreground font-mono text-2xs tracking-wider uppercase">{label}</dt>
      <dd className={cn("font-display mt-1 text-base font-bold", tone ? TONE_CLASSES[tone].text : "text-foreground")}>
        {value}
      </dd>
      {hint ? <dd className="text-muted-foreground text-xs">{hint}</dd> : null}
    </div>
  );
}
