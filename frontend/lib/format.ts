/**
 * en-IN formatting helpers. SAVERA is a Bengaluru programme, so numbers use
 * Indian digit grouping (1,23,456), money is rupees and dates are day-first.
 *
 * Every helper is pure and timezone-safe for the `YYYY-MM-DD` strings the API
 * returns: those are parsed field-by-field rather than through `new Date(s)`,
 * which would read them as UTC midnight and shift the day for IST viewers.
 */

const LOCALE = "en-IN";

/** Parses `YYYY-MM-DD` as a local-time date, never shifting across midnight. */
export function parseApiDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** `YYYY-MM-DD` for a Date, in local time (what the API expects back). */
export function toApiDate(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export function todayApiDate(): string {
  return toApiDate(new Date());
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value);
}

export function formatRupees(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** "12 Aug 2026" */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? parseApiDate(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "12 Aug" — for chips and timelines where the year is obvious from context. */
export function formatDayMonth(value: string | Date): string {
  const date = typeof value === "string" ? parseApiDate(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" }).format(date);
}

/** "August 2026" */
export function formatMonth(value: string | Date): string {
  const date = typeof value === "string" ? parseApiDate(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(date);
}

/** "1 Aug – 31 Aug 2026", collapsing the year when both ends share it. */
export function formatPeriod(start: string, end: string): string {
  const from = parseApiDate(start);
  const to = parseApiDate(end);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${sameYear ? formatDayMonth(from) : formatDate(from)} – ${formatDate(to)}`;
}

/** Whole days between two API dates (`b - a`). */
export function daysBetween(a: string, b: string): number {
  const ms = parseApiDate(b).getTime() - parseApiDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * "today" / "yesterday" / "in 3 days" / "12 Aug" — relative only inside a
 * week, because past that an exact date is easier to act on than a count.
 */
export function formatRelativeDay(value: string, from: Date = new Date()): string {
  const days = daysBetween(toApiDate(from), value);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1 && days <= 7) return `in ${days} days`;
  if (days < -1 && days >= -7) return `${Math.abs(days)} days ago`;
  return formatDayMonth(value);
}

/** "3 days ago" style phrasing for a plain day count. */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${Math.abs(count) === 1 ? singular : plural}`;
}
