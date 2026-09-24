/**
 * Pure date helpers for month keys (`YYYY-MM`), ISO dates (`YYYY-MM-DD`) and
 * clock strings (`HH:MM`). Nothing here reads the system clock: callers pass
 * `now` (normally `demoNow` from the session store).
 */
import type { IsoDate, IsoDateTime, MonthKey, Season } from "@/types/common";

const MS_PER_DAY = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const SEASON_LABEL: Record<Season, string> = {
  summer: "Summer",
  normal: "Normal",
  winter: "Winter",
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Split `YYYY-MM` into a year and a 1-based month. */
export function parseMonthKey(month: MonthKey): { year: number; month: number } {
  const [y, m] = month.split("-");
  return { year: Number(y), month: Number(m) };
}

/** Build a `YYYY-MM` key from a year and a 1-based month. */
export function toMonthKey(year: number, month1: number): MonthKey {
  return `${year}-${pad2(month1)}`;
}

/** Split `YYYY-MM-DD` into numeric parts (month 1-based). */
export function parseIsoDate(date: IsoDate): { year: number; month: number; day: number } {
  const [y, m, d] = date.split("-");
  return { year: Number(y), month: Number(m), day: Number(d) };
}

/**
 * Parse an ISO date or timestamp into a `Date`. Date-only strings are treated as
 * local midnight (consistent with `toIsoDate`), timestamps as JavaScript parses them.
 */
export function parseIso(iso: IsoDate | IsoDateTime): Date {
  if (DATE_ONLY.test(iso)) {
    const { year, month, day } = parseIsoDate(iso);
    return new Date(year, month - 1, day);
  }
  return new Date(iso);
}

/** `YYYY-MM-DD` of a `Date` in local time. */
export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Month key of an ISO date/timestamp or a local `Date`. */
export function monthKey(date: IsoDate | IsoDateTime | Date): MonthKey {
  if (date instanceof Date) return toMonthKey(date.getFullYear(), date.getMonth() + 1);
  return date.slice(0, 7);
}

/** Month key of `now` — the "current month" everywhere in the app. */
export function currentMonth(now: IsoDate): MonthKey {
  return monthKey(now);
}

/** The month before `now`'s month. */
export function previousMonth(now: IsoDate): MonthKey {
  return addMonths(monthKey(now), -1);
}

/** Add (or subtract) whole months to a month key, rolling over years. */
export function addMonths(month: MonthKey, n: number): MonthKey {
  const { year, month: m } = parseMonthKey(month);
  const index = year * 12 + (m - 1) + n;
  return toMonthKey(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** Signed number of months from `a` to `b` (`b − a`). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}

/** The `n` months ending at `month`, oldest → newest, inclusive of `month`. */
export function lastNMonths(month: MonthKey, n: number): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addMonths(month, -i));
  return out;
}

/** `'2026-09'` → `'Sep 2026'`. */
export function monthLabel(month: MonthKey): string {
  const { year, month: m } = parseMonthKey(month);
  return `${MONTH_SHORT[m - 1]} ${year}`;
}

/** `'2026-09'` → `'Sep'`. */
export function monthShort(month: MonthKey): string {
  return MONTH_SHORT[parseMonthKey(month).month - 1];
}

/** `'2026-09'` → `'September 2026'`. */
export function monthLong(month: MonthKey): string {
  const { year, month: m } = parseMonthKey(month);
  return `${MONTH_LONG[m - 1]} ${year}`;
}

/** Season bands (MASTER_PROMPT §8.2): Mar–Jun summer, Jul–Oct normal, Nov–Feb winter. */
export function seasonOf(month: MonthKey): Season {
  const m = parseMonthKey(month).month;
  if (m >= 3 && m <= 6) return "summer";
  if (m >= 7 && m <= 10) return "normal";
  return "winter";
}

/** Days in the month of a month key. */
export function daysInMonth(month: MonthKey): number {
  const { year, month: m } = parseMonthKey(month);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** First day of the month as an ISO date. */
export function startOfMonth(month: MonthKey): IsoDate {
  return `${month}-01`;
}

/** Last day of the month as an ISO date. */
export function endOfMonth(month: MonthKey): IsoDate {
  return `${month}-${pad2(daysInMonth(month))}`;
}

function utcMs(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  return Date.UTC(year, month - 1, day);
}

/** Add (or subtract) whole days to an ISO date. DST-safe (UTC arithmetic). */
export function addDays(date: IsoDate, n: number): IsoDate {
  const d = new Date(utcMs(date) + n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Signed whole days from `a` to `b` (`b − a`). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((utcMs(b) - utcMs(a)) / MS_PER_DAY);
}

/** True when `date` falls inside the given month. */
export function isInMonth(date: IsoDate, month: MonthKey): boolean {
  return date.slice(0, 7) === month;
}

/** Split `HH:MM` into hours and minutes. */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":");
  return { hours: Number(h), minutes: Number(m ?? 0) };
}

function meridiem(hours: number): "AM" | "PM" {
  return hours >= 12 ? "PM" : "AM";
}

function clock12(hours: number, minutes: number): string {
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${pad2(minutes)}`;
}

/** `'07:00'` → `'7:00 AM'`, `'19:30'` → `'7:30 PM'`. */
export function formatTime(time: string): string {
  const { hours, minutes } = parseTime(time);
  return `${clock12(hours, minutes)} ${meridiem(hours)}`;
}

/** `'07:00','08:00'` → `'7:00–8:00 AM'`; `'11:30','13:00'` → `'11:30 AM–1:00 PM'`. */
export function timeRange(start: string, end: string): string {
  const s = parseTime(start);
  const e = parseTime(end);
  if (meridiem(s.hours) === meridiem(e.hours)) {
    return `${clock12(s.hours, s.minutes)}–${clock12(e.hours, e.minutes)} ${meridiem(e.hours)}`;
  }
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Minutes between two `HH:MM` clock strings (end − start, may wrap past midnight). */
export function minutesBetween(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  const diff = e.hours * 60 + e.minutes - (s.hours * 60 + s.minutes);
  return diff < 0 ? diff + 24 * 60 : diff;
}

/** Add minutes to a `HH:MM` clock string (wraps at midnight). */
export function addMinutes(time: string, n: number): string {
  const { hours, minutes } = parseTime(time);
  const total = (((hours * 60 + minutes + n) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** ISO timestamp for a clock time on a given date (local time). */
export function atTime(date: IsoDate, time: string): IsoDateTime {
  const { year, month, day } = parseIsoDate(date);
  const { hours, minutes } = parseTime(time);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

/**
 * Human relative time between `iso` and `now`: `Just now`, `5 min ago`, `1h ago`,
 * `2 days ago`, `3 weeks ago`, `2 months ago`; future values read `In 5 min` etc.
 */
export function relativeTime(iso: IsoDate | IsoDateTime, now: IsoDate | IsoDateTime): string {
  const diffMs = parseIso(now).getTime() - parseIso(iso).getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const sec = Math.round(abs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (sec < 45) return "Just now";
  let text: string;
  if (min < 60) text = `${Math.max(1, min)} min`;
  else if (hrs < 24) text = `${hrs}h`;
  else if (days < 7) text = `${days} day${days === 1 ? "" : "s"}`;
  else if (days < 30) text = `${weeks} week${weeks === 1 ? "" : "s"}`;
  else text = `${Math.max(1, months)} month${months === 1 ? "" : "s"}`;
  return future ? `In ${text}` : `${text} ago`;
}
