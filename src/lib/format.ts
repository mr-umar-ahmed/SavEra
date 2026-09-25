/**
 * Indian-context number, currency, unit and date formatting.
 * ₹3,120 · 4,50,000 L · 4.5 lakh L · 14.2 kg · +11.4% · 22 Sep 2026.
 * All functions are pure and return "—" for non-finite numbers so the UI never shows NaN.
 */
import type { IsoDate, IsoDateTime, MonthKey } from "@/types/common";
import { MONTH_SHORT, monthLabel, parseIso } from "./dates";

export { formatTime, timeRange } from "./dates";

/** En dash used for all ranges. */
export const RANGE_DASH = "–";
export const NOT_AVAILABLE = "—";

const pad2 = (n: number): string => String(n).padStart(2, "0");

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Group an unsigned integer string Indian-style: `4500000` → `45,00,000`. */
function groupIndian(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  let rest = intStr.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) groups.unshift(rest);
  return `${groups.join(",")},${last3}`;
}

/** Drop trailing zeros after the decimal point: `'4.50'` → `'4.5'`, `'1.00'` → `'1'`. */
function trimDecimals(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** `45230` → `'45,230'`, `450000` → `'4,50,000'`, `1234.567` (2) → `'1,234.57'`. */
export function formatIN(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const rounded = roundTo(Math.abs(n), decimals);
  const [intPart, fracPart] = rounded.toFixed(decimals).split(".");
  const grouped = groupIndian(intPart);
  const sign = n < 0 && rounded !== 0 ? "-" : "";
  return fracPart ? `${sign}${grouped}.${fracPart}` : `${sign}${grouped}`;
}

export interface FormatINROptions {
  /** Decimal places (default 0). */
  decimals?: number;
  /** Prefix positive values with `+`. */
  signed?: boolean;
}

/** `3120` → `'₹3,120'`; `-500` → `'-₹500'`; `{ signed: true }` → `'+₹40'`. */
export function formatINR(n: number, opts: FormatINROptions = {}): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const { decimals = 0, signed = false } = opts;
  const body = `₹${formatIN(Math.abs(n), decimals)}`;
  if (n < 0 && roundTo(n, decimals) !== 0) return `-${body}`;
  return signed && n > 0 ? `+${body}` : body;
}

/** `390` → `'390 kWh'`. */
export function formatKwh(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n, decimals)} kWh`;
}

/** `14.2` → `'14.2 kg'`; `0.57` (2) → `'0.57 kg'`. */
export function formatKg(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n, decimals)} kg`;
}

/** `842` → `'842 MW'`. */
export function formatMw(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n, decimals)} MW`;
}

/**
 * Litres, Indian style. `short` (default): ≥ 1 crore → `'1.18 crore L'`,
 * ≥ 1 lakh → `'4.5 lakh L'`, else `'85,000 L'`. `long`: always `'4,50,000 L'`.
 */
export function formatLitres(n: number, mode: "short" | "long" = "short"): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (mode === "short" && abs >= 1e7)
    return `${sign}${trimDecimals((abs / 1e7).toFixed(2))} crore L`;
  if (mode === "short" && abs >= 1e5)
    return `${sign}${trimDecimals((abs / 1e5).toFixed(2))} lakh L`;
  return `${formatIN(n)} L`;
}

/** Mega-litre form used on city dashboards: `11800000` → `'11.8M L'`; `450000` → `'450k L'`. */
export function formatMegaLitres(n: number): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${trimDecimals((abs / 1e6).toFixed(1))}M L`;
  if (abs >= 1e3) return `${sign}${trimDecimals((abs / 1e3).toFixed(1))}k L`;
  return `${formatIN(n)} L`;
}

/** `11.4` → `'11.4%'`; signed → `'+11.4%'`; `-3.2` signed → `'-3.2%'`. */
export function formatPct(n: number, decimals = 1, signed = false): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const rounded = roundTo(n, decimals);
  const body = `${formatIN(Math.abs(rounded), decimals)}%`;
  if (rounded < 0) return `-${body}`;
  return signed && rounded > 0 ? `+${body}` : body;
}

/** `40` → `'+40'`, `-12` → `'-12'`, `0` → `'0'`. */
export function formatSigned(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const rounded = roundTo(n, decimals);
  const body = formatIN(Math.abs(rounded), decimals);
  return rounded > 0 ? `+${body}` : rounded < 0 ? `-${body}` : body;
}

/** `405, 430, 'kWh'` → `'405–430 kWh'`; unit optional; `'%'` attaches without a space. */
export function formatRange(lo: number, hi: number, unit?: string, decimals = 0): string {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return NOT_AVAILABLE;
  const body = `${formatIN(lo, decimals)}${RANGE_DASH}${formatIN(hi, decimals)}`;
  if (!unit) return body;
  return unit === "%" ? `${body}%` : `${body} ${unit}`;
}

/** `3250, 3500` → `'₹3,250–3,500'`. */
export function formatRangeINR(lo: number, hi: number, decimals = 0): string {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return NOT_AVAILABLE;
  return `₹${formatIN(lo, decimals)}${RANGE_DASH}${formatIN(hi, decimals)}`;
}

/** `'2026-09-22'` (or a timestamp) → `'22 Sep 2026'`. */
export function formatDate(iso: IsoDate | IsoDateTime): string {
  if (!iso) return NOT_AVAILABLE;
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** `'2026-09-22'` → `'22 Sep'` (no year, for compact tables). */
export function formatDayMonth(iso: IsoDate | IsoDateTime): string {
  if (!iso) return NOT_AVAILABLE;
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** `'2026-09-22T07:42:00'` → `'22 Sep 2026, 7:42 AM'` (local time). */
export function formatDateTime(iso: IsoDateTime): string {
  if (!iso) return NOT_AVAILABLE;
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
  const hours = d.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours >= 12 ? "PM" : "AM";
  return `${formatDate(iso)}, ${h12}:${pad2(d.getMinutes())} ${meridiem}`;
}

/** `'2026-09'` → `'Sep 2026'`. */
export function formatMonth(month: MonthKey): string {
  return monthLabel(month);
}

/** `127` → `'127th'`, `1` → `'1st'`, `22` → `'22nd'`, `113` → `'113th'`. */
export function ordinal(n: number): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  return `${formatIN(n)}${suffix}`;
}

/** `45230` → `'45.2k'`, `1247` → `'1.2k'`, `842` → `'842'`, `1500000` → `'1.5M'`. */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${trimDecimals((abs / 1e9).toFixed(1))}B`;
  if (abs >= 1e6) return `${sign}${trimDecimals((abs / 1e6).toFixed(1))}M`;
  if (abs >= 1e3) return `${sign}${trimDecimals((abs / 1e3).toFixed(1))}k`;
  // Small fractional values (e.g. 0.57 kg/day axis ticks) keep up to two decimals.
  if (abs < 10 && !Number.isInteger(abs)) return `${sign}${trimDecimals(abs.toFixed(2))}`;
  if (abs < 100 && !Number.isInteger(abs)) return `${sign}${trimDecimals(abs.toFixed(1))}`;
  return `${sign}${formatIN(abs)}`;
}

/** `18` → `'18 days'`, `1` → `'1 day'`. */
export function formatDays(n: number): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  const rounded = Math.round(n);
  return `${formatIN(rounded)} ${rounded === 1 ? "day" : "days"}`;
}

/** Generic count with unit and plural: `pluralize(3, 'report')` → `'3 reports'`. */
export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n)} ${n === 1 ? singular : plural}`;
}

/** `0.57, 'kg/day'` → `'0.57 kg/day'` — value with an arbitrary unit. */
export function formatUnit(n: number, unit: string, decimals = 0): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n, decimals)} ${unit}`;
}

/** Annual carbon: `2.35` → `'2.35 tCO₂e'`. */
export function formatTco2e(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return NOT_AVAILABLE;
  return `${formatIN(n, decimals)} tCO₂e`;
}
