/**
 * Shared helpers for the demo-household fixtures. Everything is relative to a `now`
 * (`demoNow`, `YYYY-MM-DD`) passed in by the caller — no `Date.now()` here — so the seed
 * is deterministic for a given date and the spec anchors ("18 days used", "350 → 390 kWh")
 * stay true whenever the demo runs.
 */

import type { IsoDate, MonthKey } from "@/types/common";
import type { ElectricityBill } from "@/types/electricity";
import type { LpgCylinder } from "@/types/lpg";

// ---------------------------------------------------------------------------
// Date math (UTC, pure)
// ---------------------------------------------------------------------------

function parseIso(iso: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** `iso + days` as `YYYY-MM-DD`. */
export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const { y, m, d } = parseIso(iso);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

/** `YYYY-MM` for the month `offset` months from `now` (0 = current, −1 = previous …). */
export function monthKeyAtOffset(now: IsoDate, offset: number): MonthKey {
  const { y, m } = parseIso(now);
  const date = new Date(Date.UTC(y, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

/** First and last day of a `YYYY-MM` month. */
export function monthBounds(month: MonthKey): { start: IsoDate; end: IsoDate } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: toIso(new Date(Date.UTC(y, m - 1, 1))),
    end: toIso(new Date(Date.UTC(y, m, 0))),
  };
}

// ---------------------------------------------------------------------------
// LPG cycles expressed relative to `now`
// ---------------------------------------------------------------------------

/** A cylinder cycle described by "days ago" so the seed can be re-anchored to any `now`. */
export interface LpgCycleSpec {
  id: string;
  /** Days before `now` the cylinder was connected. */
  daysAgoStart: number;
  /** Cycle length in days — finished cylinders only. */
  days?: number;
  /** True for the cylinder currently in use (no finish date). */
  current?: boolean;
  sizeKg: number;
  provider: string;
}

/** Materialise relative cycle specs into `LpgCylinder` records anchored on `now`. */
export function lpgCylindersFromSpec(
  householdId: string,
  specs: LpgCycleSpec[],
  now: IsoDate,
): LpgCylinder[] {
  return specs.map((spec) => {
    const startDate = addDaysIso(now, -spec.daysAgoStart);
    const cylinder: LpgCylinder = {
      id: spec.id,
      householdId,
      sizeKg: spec.sizeKg,
      // Delivered the day before it was connected.
      refillDate: addDaysIso(startDate, -1),
      startDate,
      provider: spec.provider,
      source: "seed",
    };
    if (!spec.current && spec.days !== undefined) {
      cylinder.finishDate = addDaysIso(startDate, spec.days);
    }
    return cylinder;
  });
}

// ---------------------------------------------------------------------------
// Bill history expressed by month offset
// ---------------------------------------------------------------------------

export interface BillHistoryPoint {
  /** 0 = current month, −1 = previous … −11. */
  offset: number;
  kwh: number;
  /** Billed amount in ₹. */
  amount: number;
}

/**
 * Materialise a 12-month history into `ElectricityBill` records anchored on `now`.
 * Meter readings are cumulative from `meterStart` (oldest bill first).
 */
export function billsFromHistory(
  householdId: string,
  history: BillHistoryPoint[],
  now: IsoDate,
  opts: { meterStart: number; tariffName: string },
): ElectricityBill[] {
  const ordered = [...history].sort((a, b) => a.offset - b.offset);
  let meter = opts.meterStart;
  return ordered.map((point) => {
    const month = monthKeyAtOffset(now, point.offset);
    const { start, end } = monthBounds(month);
    const meterPrev = meter;
    meter += point.kwh;
    return {
      id: `bill-${householdId.toLowerCase()}-${month}`,
      householdId,
      periodStart: start,
      periodEnd: end,
      billDate: end,
      month,
      kwh: point.kwh,
      amount: point.amount,
      meterPrev,
      meterCurr: meter,
      consumerCategory: "domestic",
      tariffName: opts.tariffName,
      source: "seed",
    };
  });
}
