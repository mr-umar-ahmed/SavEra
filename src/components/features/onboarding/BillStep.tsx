"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Pencil, ScanLine, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { BillDropzone, type BillExtractionResult } from "@/components/features/bills";
import { LabelChip } from "@/components/savera/LabelChip";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { useDataStore } from "@/stores/data";
import { currentMonth, endOfMonth, monthKey, monthLabel, startOfMonth } from "@/lib/dates";
import { formatINR, formatKwh } from "@/lib/format";
import { CONSUMER_CATEGORY_LABEL } from "@/types/household";
import type { ConsumerCategory, ElectricityBill, Household } from "@/types";
import { cn } from "@/lib/utils";
import { StepShell } from "./StepShell";
import { AsideTips } from "./OnboardingPrimitives";

export interface BillStepProps {
  household: Household;
  demoNow: string;
  /** A bill this household already uploaded/entered for the current month (resume after refresh). */
  existingUpload?: ElectricityBill;
  onSaved: (bill: ElectricityBill) => void;
  onContinue: () => void;
  onSkip: () => void;
}

type Mode = "scan" | "manual";

interface BillForm {
  kwh: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  billDate: string;
  meterPrev: string;
  meterCurr: string;
  consumerCategory: ConsumerCategory;
}

type FormErrors = Partial<Record<keyof BillForm, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES: ConsumerCategory[] = ["domestic", "bpl", "commercial"];
const TARIFF_LABEL = "Demo tariff — configurable";

const TIPS = [
  { title: "Measured, not estimated", text: "Units, period and readings from a bill are stored as measured values." },
  { title: "Edit anything", text: "Every extracted field is editable — the bill is saved only when you confirm." },
  { title: "One bill is enough", text: "The dashboard works from a single bill; more bills sharpen the baseline." },
] as const;

function emptyForm(demoNow: string): BillForm {
  const month = currentMonth(demoNow);
  return {
    kwh: "",
    amount: "",
    periodStart: startOfMonth(month),
    periodEnd: endOfMonth(month),
    billDate: endOfMonth(month),
    meterPrev: "",
    meterCurr: "",
    consumerCategory: "domestic",
  };
}

function formFromExtraction(result: BillExtractionResult): BillForm {
  const x = result.extraction;
  return {
    kwh: String(x.kwh),
    amount: String(x.amount),
    periodStart: x.periodStart,
    periodEnd: x.periodEnd,
    billDate: x.billDate,
    meterPrev: String(x.meterPrev),
    meterCurr: String(x.meterCurr),
    consumerCategory: x.consumerCategory,
  };
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function validate(form: BillForm): FormErrors {
  const errors: FormErrors = {};
  const kwh = Number(form.kwh);
  if (!form.kwh.trim() || !Number.isFinite(kwh) || kwh <= 0) errors.kwh = "Enter the units consumed (kWh).";
  if (form.amount.trim() && (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0)) {
    errors.amount = "Amount must be zero or more.";
  }
  if (!ISO_DATE.test(form.periodStart)) errors.periodStart = "Choose the period start.";
  if (!ISO_DATE.test(form.periodEnd)) errors.periodEnd = "Choose the period end.";
  if (!errors.periodStart && !errors.periodEnd && form.periodEnd < form.periodStart) {
    errors.periodEnd = "Period end must be on or after the start.";
  }
  if (form.billDate && !ISO_DATE.test(form.billDate)) errors.billDate = "Choose a valid bill date.";
  const prev = numberOrUndefined(form.meterPrev);
  const curr = numberOrUndefined(form.meterCurr);
  if (form.meterPrev.trim() && prev === undefined) errors.meterPrev = "Reading must be a number.";
  if (form.meterCurr.trim() && curr === undefined) errors.meterCurr = "Reading must be a number.";
  if (prev !== undefined && curr !== undefined && curr < prev) {
    errors.meterCurr = "Current reading must be at least the previous reading.";
  }
  return errors;
}

/* ------------------------------------------------------------------ */

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ id, label, error, children, className }: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-2xs font-semibold text-tone-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Step 4 — the heart of the flow: real file picker + simulated OCR, editable extraction, `addBill`. */
export function BillStep({ household, demoNow, existingUpload, onSaved, onContinue, onSkip }: BillStepProps) {
  const addBill = useDataStore((s) => s.addBill);
  const reducedMotion = useReducedMotion();
  const uid = React.useId();

  const [mode, setMode] = React.useState<Mode>("scan");
  const [extraction, setExtraction] = React.useState<BillExtractionResult | null>(null);
  const [form, setForm] = React.useState<BillForm>(() => emptyForm(demoNow));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saved, setSaved] = React.useState<ElectricityBill | null>(existingUpload ?? null);
  const [dirty, setDirty] = React.useState(false);

  const showForm = mode === "manual" || extraction !== null;
  const canContinue = saved !== null && !dirty;

  const update = <K extends keyof BillForm>(key: K, value: BillForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (saved) setDirty(true);
  };

  const handleExtracted = React.useCallback((result: BillExtractionResult) => {
    setExtraction(result);
    setForm(formFromExtraction(result));
    setErrors({});
    setDirty(false);
    setSaved(null);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    if (next === "manual") {
      setForm((prev) => (extraction ? prev : emptyForm(demoNow)));
    }
  };

  const handleSave = () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Check the highlighted fields.");
      return;
    }
    const kwh = Math.round(Number(form.kwh));
    const month = monthKey(form.periodEnd);
    const amount = numberOrUndefined(form.amount);
    const bill: ElectricityBill = {
      id: `bill-${household.id.toLowerCase()}-${month}`,
      householdId: household.id,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      billDate: ISO_DATE.test(form.billDate) ? form.billDate : form.periodEnd,
      month,
      kwh,
      amount: amount === undefined ? undefined : Math.round(amount),
      meterPrev: numberOrUndefined(form.meterPrev),
      meterCurr: numberOrUndefined(form.meterCurr),
      consumerCategory: form.consumerCategory,
      tariffName: extraction?.extraction.tariffName ?? "Demo Domestic LT-1",
      source: mode === "manual" ? "manual" : "upload",
    };
    addBill(bill);
    setSaved(bill);
    setDirty(false);
    toast.success(`Bill added — ${formatKwh(kwh)} for ${monthLabel(month)}.`, {
      description:
        bill.amount !== undefined
          ? `${formatINR(bill.amount)} · ${household.id} · stored as measured values`
          : `${household.id} · stored as measured values`,
    });
    onSaved(bill);
  };

  const cardMotion = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <StepShell
      eyebrow="Step 4 · Latest bill"
      icon={ScanLine}
      title="Scan your latest electricity bill"
      description="Take a photo or choose the PDF from your phone or computer. We read the units, period and meter readings — then you confirm."
      headerAside={<LabelChip kind="simulated" label="Simulated OCR" />}
      aside={<AsideTips items={TIPS} />}
      footer={
        <>
          <SkipRow onSkip={onSkip} label="Keep my seeded bill" />
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <Button type="button" onClick={onContinue} disabled={!canContinue} className="w-full sm:w-auto">
              Continue
              <ArrowRight className="size-4" />
            </Button>
            {!canContinue ? (
              <span className="text-2xs text-faint sm:text-right">Save a bill or skip to continue.</span>
            ) : null}
          </div>
        </>
      }
    >
      {mode === "scan" ? (
        <BillDropzone stream="electricity" onExtracted={handleExtracted} scanDurationMs={2600} />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-inset px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">Entering the bill manually</div>
            <p className="text-xs text-muted-foreground">Copy the units and billing period from the printed bill.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => switchMode("scan")} className="shrink-0">
            <Undo2 className="size-3.5" />
            Back to scanning
          </Button>
        </div>
      )}

      {mode === "scan" && !extraction ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">No file at hand?</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => switchMode("manual")}>
            <Pencil className="size-3.5" />
            Enter manually instead
          </Button>
        </div>
      ) : null}

      {showForm ? (
        <motion.div
          key={extraction ? `${extraction.file.name}-${extraction.index}` : "manual"}
          {...cardMotion}
          className="rounded-2xl border border-positive/30 bg-positive/[0.06] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">{extraction ? "Extracted" : "Bill details"}</span>
              {extraction ? <LabelChip kind="simulated" label="Simulated OCR" size="sm" /> : null}
            </div>
            {extraction ? (
              <span className="font-mono text-2xs font-semibold tracking-wider text-positive uppercase">
                Confidence {extraction.extraction.confidence}
              </span>
            ) : null}
          </div>
          {extraction ? (
            <p className="mt-1 truncate font-mono text-2xs text-muted-foreground">
              {extraction.file.isSample ? "Sample bill" : extraction.file.name} · review and edit any field
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field id={`${uid}-kwh`} label="Units (kWh)" error={errors.kwh}>
              <Input
                id={`${uid}-kwh`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="e.g. 390"
                value={form.kwh}
                onChange={(e) => update("kwh", e.target.value)}
                aria-invalid={!!errors.kwh}
                aria-describedby={errors.kwh ? `${uid}-kwh-error` : undefined}
                className="font-mono"
              />
            </Field>
            <Field id={`${uid}-amount`} label="Amount (₹)" error={errors.amount}>
              <Input
                id={`${uid}-amount`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="optional"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? `${uid}-amount-error` : undefined}
                className="font-mono"
              />
            </Field>
            <Field id={`${uid}-start`} label="Billing period start" error={errors.periodStart}>
              <Input
                id={`${uid}-start`}
                type="date"
                value={form.periodStart}
                onChange={(e) => update("periodStart", e.target.value)}
                aria-invalid={!!errors.periodStart}
                aria-describedby={errors.periodStart ? `${uid}-start-error` : undefined}
                className="font-mono"
              />
            </Field>
            <Field id={`${uid}-end`} label="Billing period end" error={errors.periodEnd}>
              <Input
                id={`${uid}-end`}
                type="date"
                value={form.periodEnd}
                onChange={(e) => update("periodEnd", e.target.value)}
                aria-invalid={!!errors.periodEnd}
                aria-describedby={errors.periodEnd ? `${uid}-end-error` : undefined}
                className="font-mono"
              />
            </Field>

            {extraction ? (
              <>
                <Field id={`${uid}-billdate`} label="Bill date" error={errors.billDate}>
                  <Input
                    id={`${uid}-billdate`}
                    type="date"
                    value={form.billDate}
                    onChange={(e) => update("billDate", e.target.value)}
                    aria-invalid={!!errors.billDate}
                    className="font-mono"
                  />
                </Field>
                <Field id={`${uid}-category`} label="Consumer category">
                  <Select
                    value={form.consumerCategory}
                    onValueChange={(v) => update("consumerCategory", v as ConsumerCategory)}
                  >
                    <SelectTrigger id={`${uid}-category`} className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CONSUMER_CATEGORY_LABEL[c]}
                          {c === "domestic" ? " (LT-2)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id={`${uid}-prev`} label="Meter reading — previous" error={errors.meterPrev}>
                  <Input
                    id={`${uid}-prev`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.meterPrev}
                    onChange={(e) => update("meterPrev", e.target.value)}
                    aria-invalid={!!errors.meterPrev}
                    className="font-mono"
                  />
                </Field>
                <Field id={`${uid}-curr`} label="Meter reading — current" error={errors.meterCurr}>
                  <Input
                    id={`${uid}-curr`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.meterCurr}
                    onChange={(e) => update("meterCurr", e.target.value)}
                    aria-invalid={!!errors.meterCurr}
                    aria-describedby={errors.meterCurr ? `${uid}-curr-error` : undefined}
                    className="font-mono"
                  />
                </Field>
                <Field id={`${uid}-tariff`} label="Tariff" className="sm:col-span-2">
                  <Input id={`${uid}-tariff`} type="text" value={TARIFF_LABEL} readOnly className="font-mono text-soft" />
                </Field>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-w-0">
              {saved && !dirty ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-sm font-bold text-positive">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    Saved — {formatKwh(saved.kwh)} for {monthLabel(saved.month)}
                    {saved.amount !== undefined ? ` · ${formatINR(saved.amount)}` : ""}
                  </span>
                  <LabelChip kind="measured" size="sm" />
                </span>
              ) : dirty ? (
                <span className="text-xs text-muted-foreground">Edited since the last save — save again to keep the changes.</span>
              ) : (
                <span className="text-xs text-muted-foreground">Saved values are stored as measured, never estimated.</span>
              )}
            </div>
            <Button
              type="button"
              variant={saved && !dirty ? "positive" : "default"}
              onClick={handleSave}
              disabled={!!saved && !dirty}
              className="w-full sm:w-auto"
            >
              {saved && !dirty ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Saved
                </>
              ) : dirty ? (
                "Save changes"
              ) : (
                "Looks right — save bill"
              )}
            </Button>
          </div>
        </motion.div>
      ) : null}

      {!showForm && saved ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm font-bold text-positive">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            Already saved — {formatKwh(saved.kwh)} for {monthLabel(saved.month)}
          </span>
          <LabelChip kind="measured" size="sm" />
          <span className="text-xs font-normal text-muted-foreground">Scan again to replace it.</span>
        </div>
      ) : null}
    </StepShell>
  );
}
