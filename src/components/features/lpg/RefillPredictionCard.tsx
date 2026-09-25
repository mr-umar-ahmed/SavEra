"use client";

import * as React from "react";
import { BellRing, CalendarClock, Truck } from "lucide-react";
import { toast } from "sonner";

import type { LpgHouseholdView } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import { formatDate, formatDayMonth, formatDays } from "@/lib/format";
import { cn } from "@/lib/utils";

const REMINDER_OPTIONS = [3, 2, 1] as const;

/** Refill Prediction (spec 03 §7): estimated date, window, basis, reminder, simulated booking. */
export function RefillPredictionCard({ view }: { view: LpgHouseholdView }) {
  const { analysis, refillWindow: window, householdId, activeBooking, reminders } = view;
  const [daysBefore, setDaysBefore] = React.useState<number>(2);
  const [busy, setBusy] = React.useState<"reminder" | "booking" | null>(null);
  const refill = analysis.refill;
  const latestReminder = reminders[0];

  if (!refill || !analysis.current) {
    return (
      <section id="refill" className="glass scroll-mt-28 rounded-2xl p-6">
        <p className="eyebrow">Refill prediction</p>
        <p className="text-soft mt-3 text-sm">
          Add the cylinder you are using now and SAVERA will estimate when you need your next refill.
        </p>
      </section>
    );
  }

  const setReminder = async () => {
    setBusy("reminder");
    const res = await lpgApi.setRefillReminder(householdId, refill.date, daysBefore);
    setBusy(null);
    if (res.ok) toast.success(`Reminder set for ${formatDate(res.data.dueAt.slice(0, 10))}`);
    else toast.error(res.error);
  };

  const book = async () => {
    setBusy("booking");
    const res = await lpgApi.bookRefill(householdId, analysis.current?.sizeKg);
    setBusy(null);
    if (res.ok) {
      toast.success(`Refill booking ${res.data.ref} requested`, { description: "Simulated booking — no real provider is contacted." });
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else toast.error(res.error);
  };

  return (
    <section id="refill" className="glass scroll-mt-28 flex flex-col gap-5 rounded-2xl p-6" aria-labelledby="lpg-refill-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-2">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          Refill prediction
        </p>
        <EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} size="sm" />
      </div>

      <div>
        <p className="text-muted-foreground text-sm">Expected refill date</p>
        <h2 id="lpg-refill-title" className="font-display text-foreground mt-1 text-3xl font-extrabold">
          ~{formatDate(refill.date)}
        </h2>
        {window ? (
          <p className="text-soft mt-1 text-sm">
            Likely between {formatDayMonth(window.earliest)} and {formatDate(window.latest)} ·{" "}
            {refill.daysFromNow > 0 ? `in about ${formatDays(refill.daysFromNow)}` : "due now"}
          </p>
        ) : null}
      </div>

      <p className="bg-muted border-border text-soft rounded-xl border p-3.5 text-sm leading-relaxed">
        <span className="text-foreground font-semibold">Basis: </span>
        {analysis.current.sizeKg} kg cylinder · started {formatDayMonth(analysis.current.startDate)} ·{" "}
        {refill.basis}.
      </p>

      <div className="space-y-2">
        <p className="text-foreground text-sm font-semibold">Remind me before the refill date</p>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Reminder lead time">
          {REMINDER_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={daysBefore === d}
              onClick={() => setDaysBefore(d)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
                daysBefore === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border-strong bg-card text-soft hover:bg-muted",
              )}
            >
              {d} day{d === 1 ? "" : "s"} before
            </button>
          ))}
        </div>
        {latestReminder ? (
          <p className="text-positive text-xs font-semibold">
            Reminder set for {formatDate(latestReminder.dueAt.slice(0, 10))}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="outline" onClick={setReminder} disabled={busy !== null} className="gap-2">
          <BellRing className="size-4" />
          {busy === "reminder" ? "Setting…" : "Set Reminder"}
        </Button>
        <Button onClick={book} disabled={busy !== null || !!activeBooking} className="gap-2">
          <Truck className="size-4" />
          {activeBooking ? `Booking ${activeBooking.ref} in progress` : busy === "booking" ? "Booking…" : "Book Refill (simulated)"}
        </Button>
        <LabelChip kind="simulated" size="sm" className="self-center" />
      </div>
    </section>
  );
}
