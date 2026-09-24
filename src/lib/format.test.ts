import { describe, expect, it } from "vitest";
import {
  compactNumber,
  formatDate,
  formatDateTime,
  formatDays,
  formatIN,
  formatINR,
  formatKg,
  formatKwh,
  formatLitres,
  formatMegaLitres,
  formatMonth,
  formatPct,
  formatRange,
  formatRangeINR,
  formatSigned,
  formatTime,
  ordinal,
  pluralize,
} from "./format";

describe("formatIN", () => {
  it("groups Indian-style (3 then 2s)", () => {
    expect(formatIN(999)).toBe("999");
    expect(formatIN(1000)).toBe("1,000");
    expect(formatIN(45230)).toBe("45,230");
    expect(formatIN(450000)).toBe("4,50,000");
    expect(formatIN(11800000)).toBe("1,18,00,000");
    expect(formatIN(123456789)).toBe("12,34,56,789");
  });

  it("handles decimals, negatives and rounding", () => {
    expect(formatIN(1234.567, 2)).toBe("1,234.57");
    expect(formatIN(0.57, 2)).toBe("0.57");
    expect(formatIN(-450000)).toBe("-4,50,000");
    expect(formatIN(2850.4)).toBe("2,850");
    expect(formatIN(2850.5)).toBe("2,851");
    expect(formatIN(-0.2)).toBe("0");
  });

  it("never renders NaN", () => {
    expect(formatIN(Number.NaN)).toBe("—");
    expect(formatINR(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("currency", () => {
  it("formats rupees without decimals by default", () => {
    expect(formatINR(3120)).toBe("₹3,120");
    expect(formatINR(2850.4)).toBe("₹2,850");
    expect(formatINR(450000)).toBe("₹4,50,000");
    expect(formatINR(99.5, { decimals: 2 })).toBe("₹99.50");
  });

  it("handles sign", () => {
    expect(formatINR(-500)).toBe("-₹500");
    expect(formatINR(40, { signed: true })).toBe("+₹40");
    expect(formatINR(0, { signed: true })).toBe("₹0");
  });

  it("formats rupee ranges with a single symbol", () => {
    expect(formatRangeINR(3250, 3500)).toBe("₹3,250–3,500");
  });
});

describe("units", () => {
  it("formats kWh and kg", () => {
    expect(formatKwh(390)).toBe("390 kWh");
    expect(formatKwh(1250)).toBe("1,250 kWh");
    expect(formatKg(14.2)).toBe("14.2 kg");
    expect(formatKg(14)).toBe("14.0 kg");
    expect(formatKg(0.57, 2)).toBe("0.57 kg");
    expect(formatKg(58000, 0)).toBe("58,000 kg");
  });

  it("formats litres in lakh / crore short form", () => {
    expect(formatLitres(450000)).toBe("4.5 lakh L");
    expect(formatLitres(100000)).toBe("1 lakh L");
    expect(formatLitres(125000)).toBe("1.25 lakh L");
    expect(formatLitres(11800000)).toBe("1.18 crore L");
    expect(formatLitres(10000000)).toBe("1 crore L");
    expect(formatLitres(85000)).toBe("85,000 L");
    expect(formatLitres(0)).toBe("0 L");
  });

  it("formats litres in long form", () => {
    expect(formatLitres(450000, "long")).toBe("4,50,000 L");
    expect(formatLitres(11800000, "long")).toBe("1,18,00,000 L");
  });

  it("formats mega-litres for city dashboards", () => {
    expect(formatMegaLitres(11800000)).toBe("11.8M L");
    expect(formatMegaLitres(10900000)).toBe("10.9M L");
    expect(formatMegaLitres(12400000)).toBe("12.4M L");
    expect(formatMegaLitres(12000000)).toBe("12M L");
    expect(formatMegaLitres(450000)).toBe("450k L");
    expect(formatMegaLitres(800)).toBe("800 L");
  });

  it("formats ranges with optional units", () => {
    expect(formatRange(405, 430, "kWh")).toBe("405–430 kWh");
    expect(formatRange(320, 350)).toBe("320–350");
    expect(formatRange(0.55, 0.6, "kg/day", 2)).toBe("0.55–0.60 kg/day");
    expect(formatRange(5, 15, "%")).toBe("5–15%");
  });
});

describe("percentages and signs", () => {
  it("formats percentages", () => {
    expect(formatPct(11.4)).toBe("11.4%");
    expect(formatPct(11.4, 1, true)).toBe("+11.4%");
    expect(formatPct(-3.2, 1, true)).toBe("-3.2%");
    expect(formatPct(12, 0)).toBe("12%");
    expect(formatPct(0, 1, true)).toBe("0.0%");
    expect(formatPct(99.9)).toBe("99.9%");
  });

  it("formats signed deltas", () => {
    expect(formatSigned(40)).toBe("+40");
    expect(formatSigned(-12)).toBe("-12");
    expect(formatSigned(0)).toBe("0");
  });
});

describe("dates and months", () => {
  it("formats dates and timestamps", () => {
    expect(formatDate("2026-09-22")).toBe("22 Sep 2026");
    expect(formatDate("2026-01-05")).toBe("5 Jan 2026");
    expect(formatDateTime("2026-09-22T07:42:00")).toBe("22 Sep 2026, 7:42 AM");
    expect(formatDateTime("2026-09-22T19:05:00")).toBe("22 Sep 2026, 7:05 PM");
    expect(formatDate("")).toBe("—");
  });

  it("formats month keys and times", () => {
    expect(formatMonth("2026-09")).toBe("Sep 2026");
    expect(formatTime("07:00")).toBe("7:00 AM");
  });
});

describe("ordinal and compact", () => {
  it("adds ordinal suffixes", () => {
    expect(ordinal(127)).toBe("127th");
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(84)).toBe("84th");
    expect(ordinal(101)).toBe("101st");
    expect(ordinal(111)).toBe("111th");
    expect(ordinal(1000)).toBe("1,000th");
  });

  it("compacts large numbers", () => {
    expect(compactNumber(45230)).toBe("45.2k");
    expect(compactNumber(45000)).toBe("45k");
    expect(compactNumber(1247)).toBe("1.2k");
    expect(compactNumber(842)).toBe("842");
    expect(compactNumber(1500000)).toBe("1.5M");
    expect(compactNumber(-2300)).toBe("-2.3k");
  });

  it("pluralises counts", () => {
    expect(formatDays(18)).toBe("18 days");
    expect(formatDays(1)).toBe("1 day");
    expect(pluralize(3, "report")).toBe("3 reports");
    expect(pluralize(1, "household")).toBe("1 household");
    expect(pluralize(700, "participant")).toBe("700 participants");
  });
});
