"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Database, History, Layers, ScanLine } from "lucide-react";
import { BillDropzone, type BillExtractionResult } from "@/components/features/bills";
import { LabelChip } from "@/components/savera/LabelChip";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { useDataStore } from "@/stores/data";
import { addMonths, currentMonth, monthLabel, previousMonth } from "@/lib/dates";
import { formatINR, formatKwh } from "@/lib/format";
import type { ElectricityBill, Household, MonthKey } from "@/types";
import { cn } from "@/lib/utils";
import { StepShell } from "./StepShell";
import { AsideTips } from "./OnboardingPrimitives";

export interface HistoryStepProps {
  household: Household;
  demoNow: string;
  onContinue: (previousBills: number) => void;
  onSkip: () => void;
}

type Mode = "import" | "scan";
const QUICK_PICKS = [3, 6, 12] as const;
/** Bills needed (including the current one) before a seasonal baseline is built. */
const SEASONAL_MIN_BILLS = 6;

interface ScannedRow {
  month: MonthKey;
  kwh: number;
  fileName: string;
}

const TIPS = [
  { title: "Why older bills", text: "Six or more months let SAVERA split your baseline into Summer / Normal / Winter bands." },
  { title: "On file already", text: "Bills already attached to your household are imported without re-typing." },
  { title: "Nothing is lost", text: "Skip now and add bills any time from the Electricity page." },
] as const;

/** Step 5 — optional older bills: instant import from records on file, or a multi-file scan. */
export function HistoryStep({ household, demoNow, onContinue, onSkip }: HistoryStepProps) {
  const bills = useDataStore((s) => s.bills);
  const reducedMotion = useReducedMotion();

  const current = currentMonth(demoNow);
  const older = React.useMemo<ElectricityBill[]>(
    () =>
      bills
        .filter((b) => b.householdId === household.id && b.month < current)
        .sort((a, b) => b.month.localeCompare(a.month)),
    [bills, household.id, current],
  );

  const [mode, setMode] = React.useState<Mode>("import");
  const [pick, setPick] = React.useState<number | null>(null);
  const [scanned, setScanned] = React.useState<ScannedRow[]>([]);

  const imported = pick === null ? [] : older.slice(0, pick);
  const count = imported.length + scanned.length;
  const totalBills = 1 + count;
  const seasonalReady = totalBills >= SEASONAL_MIN_BILLS;

  const handleExtracted = React.useCallback(
    (result: BillExtractionResult) => {
      setScanned((prev) => {
        const taken = new Set(prev.map((r) => r.month));
        let month = previousMonth(demoNow);
        while (taken.has(month)) month = addMonths(month, -1);
        return [...prev, { month, kwh: result.extraction.kwh, fileName: result.file.name }];
      });
    },
    [demoNow],
  );

  const rowMotion = (i: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <StepShell
      eyebrow="Step 5 · Older bills"
      icon={History}
      title="Add older bills (optional)"
      description={`Add older bills to unlock a seasonal baseline (${SEASONAL_MIN_BILLS}+ bills). Import the ones already on file for ${household.id}, or scan more from your device.`}
      aside={<AsideTips items={TIPS} />}
      footer={
        <>
          <SkipRow onSkip={onSkip} label="Build from current data" />
          <Button type="button" onClick={() => onContinue(count)} className="w-full sm:w-auto">
            {count > 0 ? `Continue with ${count} older ${count === 1 ? "bill" : "bills"}` : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      {/* Mode switch */}
      <div role="group" aria-label="How to add older bills" className="inline-flex w-full rounded-full border border-border bg-muted p-1 sm:w-auto">
        {(
          [
            { id: "import", label: "Import from records", icon: Database },
            { id: "scan", label: "Scan more bills", icon: ScanLine },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(opt.id)}
              className={cn(
                "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex-none",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {mode === "import" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-foreground">Quick pick</span>
              <span className="font-mono text-2xs text-muted-foreground">
                {older.length} older {older.length === 1 ? "bill" : "bills"} on file
              </span>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Months to import">
              {QUICK_PICKS.map((n) => {
                const active = pick === n;
                const available = Math.min(n, older.length);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={active}
                    disabled={older.length === 0}
                    onClick={() => setPick(active ? null : n)}
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 font-mono text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-soft hover:border-border-strong hover:bg-muted",
                    )}
                  >
                    Last {n} months{available < n ? ` (${available})` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {imported.length > 0 ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card" aria-label="Imported bills">
              {imported.map((b, i) => (
                <motion.li
                  key={b.id}
                  {...rowMotion(i)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold text-foreground">{monthLabel(b.month)}</span>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-xs text-soft">
                    <span className="font-bold text-foreground">{formatKwh(b.kwh)}</span>
                    {b.amount !== undefined ? <span>{formatINR(b.amount)}</span> : null}
                    <LabelChip kind="measured" size="sm" />
                  </span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border-strong bg-muted/60 px-4 py-6 text-center text-xs text-muted-foreground">
              {older.length > 0
                ? "Pick a range above — the bills are already on file, nothing to re-type."
                : "No older bills on file yet — scan a few from your device instead."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <BillDropzone
            stream="electricity"
            multiple
            maxFiles={11}
            allowSample={false}
            scanDurationMs={1200}
            resetAfterScan
            title="Scan older bills"
            hint="Choose several PDFs or photos at once · each one is assigned to the next older month"
            onExtracted={handleExtracted}
          />
          {scanned.length > 0 ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card" aria-label="Scanned bills">
              {scanned.map((row, i) => (
                <motion.li
                  key={row.month}
                  {...rowMotion(i)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{monthLabel(row.month)}</span>
                    <span className="block truncate font-mono text-2xs text-muted-foreground">{row.fileName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-xs">
                    <span className="font-bold text-foreground">{formatKwh(row.kwh)}</span>
                    <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
                  </span>
                </motion.li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {/* Running total */}
      <div
        aria-live="polite"
        className={cn(
          "flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          seasonalReady ? "border-positive/30 bg-positive/10" : "border-border bg-inset",
        )}
      >
        <p className="text-sm text-soft">
          <span className="font-mono font-bold text-foreground">{count}</span> older{" "}
          {count === 1 ? "bill" : "bills"} attached ·{" "}
          <span className="font-mono font-bold text-foreground">{totalBills}</span> in total
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-2xs font-semibold tracking-wider uppercase",
            seasonalReady ? "text-positive" : "text-muted-foreground",
          )}
        >
          <Layers className="size-3.5" aria-hidden="true" />
          {seasonalReady
            ? "Seasonal baseline unlocked"
            : `${SEASONAL_MIN_BILLS - totalBills} more for a seasonal baseline`}
        </span>
      </div>
    </StepShell>
  );
}
