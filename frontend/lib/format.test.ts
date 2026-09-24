import { describe, expect, it } from "vitest";

import {
  daysBetween,
  formatDate,
  formatDayMonth,
  formatMonth,
  formatNumber,
  formatPeriod,
  formatRelativeDay,
  formatRupees,
  parseApiDate,
  pluralise,
  toApiDate,
} from "@/lib/format";

describe("API date handling", () => {
  it("parses YYYY-MM-DD in local time, not UTC", () => {
    const parsed = parseApiDate("2026-08-01");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    // The bug this guards: `new Date("2026-08-01")` is UTC midnight, which is
    // 31 July for anyone west of Greenwich and the wrong day on the screen.
    expect(parsed.getDate()).toBe(1);
  });

  it("round-trips through toApiDate", () => {
    expect(toApiDate(parseApiDate("2026-02-29"))).toBe("2026-03-01"); // 2026 is not a leap year
    expect(toApiDate(parseApiDate("2026-09-24"))).toBe("2026-09-24");
  });

  it("ignores a time component the API may append", () => {
    expect(toApiDate(parseApiDate("2026-09-24T18:30:00Z"))).toBe("2026-09-24");
  });

  it("counts whole days between two dates", () => {
    expect(daysBetween("2026-08-01", "2026-08-31")).toBe(30);
    expect(daysBetween("2026-08-31", "2026-08-01")).toBe(-30);
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(0);
  });
});

describe("number formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatNumber(123456)).toBe("1,23,456");
    expect(formatNumber(342)).toBe("342");
  });

  it("rounds to the requested precision", () => {
    expect(formatNumber(0.4581, 2)).toBe("0.46");
    expect(formatNumber(9.44, 1)).toBe("9.4");
  });

  it("formats rupees without paise", () => {
    expect(formatRupees(2791.2)).toContain("2,791");
    expect(formatRupees(2791.2)).not.toContain(".20");
  });
});

describe("date formatting", () => {
  it("writes dates day-first", () => {
    expect(formatDate("2026-08-31")).toBe("31 Aug 2026");
    expect(formatDayMonth("2026-08-31")).toBe("31 Aug");
    expect(formatMonth("2026-08-01")).toBe("August 2026");
  });

  it("collapses the year in a period that stays inside one", () => {
    expect(formatPeriod("2026-08-01", "2026-08-31")).toBe("1 Aug – 31 Aug 2026");
  });

  it("keeps both years in a period that crosses one", () => {
    expect(formatPeriod("2025-12-15", "2026-01-14")).toBe("15 Dec 2025 – 14 Jan 2026");
  });
});

describe("formatRelativeDay", () => {
  const from = parseApiDate("2026-09-24");

  it("names the days around today", () => {
    expect(formatRelativeDay("2026-09-24", from)).toBe("today");
    expect(formatRelativeDay("2026-09-25", from)).toBe("tomorrow");
    expect(formatRelativeDay("2026-09-23", from)).toBe("yesterday");
  });

  it("counts inside a week in both directions", () => {
    expect(formatRelativeDay("2026-09-27", from)).toBe("in 3 days");
    expect(formatRelativeDay("2026-09-19", from)).toBe("5 days ago");
  });

  it("falls back to a real date beyond a week", () => {
    expect(formatRelativeDay("2026-10-15", from)).toBe("15 Oct");
    expect(formatRelativeDay("2026-08-01", from)).toBe("1 Aug");
  });
});

describe("pluralise", () => {
  it("agrees with the count", () => {
    expect(pluralise(1, "day")).toBe("1 day");
    expect(pluralise(31, "day")).toBe("31 days");
    expect(pluralise(0, "day")).toBe("0 days");
  });

  it("accepts an irregular plural", () => {
    expect(pluralise(2, "person", "people")).toBe("2 people");
  });
});
