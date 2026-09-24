import { describe, expect, it } from "vitest";
import {
  addDays,
  addMinutes,
  addMonths,
  currentMonth,
  daysBetween,
  daysInMonth,
  endOfMonth,
  formatTime,
  lastNMonths,
  minutesBetween,
  monthKey,
  monthLabel,
  monthShort,
  monthsBetween,
  parseIso,
  previousMonth,
  relativeTime,
  seasonOf,
  startOfMonth,
  timeRange,
  toIsoDate,
} from "./dates";

describe("month keys", () => {
  it("derives a month key from ISO strings and local Dates", () => {
    expect(monthKey("2026-09-25")).toBe("2026-09");
    expect(monthKey("2026-09-25T10:00:00.000Z")).toBe("2026-09");
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", -14)).toBe("2025-07");
    expect(addMonths("2026-09", 15)).toBe("2027-12");
    expect(addMonths("2026-09", 0)).toBe("2026-09");
  });

  it("counts months between keys with sign", () => {
    expect(monthsBetween("2025-11", "2026-02")).toBe(3);
    expect(monthsBetween("2026-02", "2025-11")).toBe(-3);
    expect(monthsBetween("2026-09", "2026-09")).toBe(0);
  });

  it("lists the last N months oldest to newest, inclusive", () => {
    expect(lastNMonths("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(lastNMonths("2026-09", 1)).toEqual(["2026-09"]);
    expect(lastNMonths("2026-09", 12)[0]).toBe("2025-10");
  });

  it("labels months", () => {
    expect(monthLabel("2026-09")).toBe("Sep 2026");
    expect(monthShort("2026-09")).toBe("Sep");
    expect(monthLabel("2027-01")).toBe("Jan 2027");
  });

  it("derives current and previous month from now", () => {
    expect(currentMonth("2026-09-25")).toBe("2026-09");
    expect(previousMonth("2026-01-03")).toBe("2025-12");
  });
});

describe("seasonOf", () => {
  it("maps Mar–Jun to summer, Jul–Oct to normal, Nov–Feb to winter", () => {
    expect(seasonOf("2026-03")).toBe("summer");
    expect(seasonOf("2026-06")).toBe("summer");
    expect(seasonOf("2026-07")).toBe("normal");
    expect(seasonOf("2026-10")).toBe("normal");
    expect(seasonOf("2026-11")).toBe("winter");
    expect(seasonOf("2026-12")).toBe("winter");
    expect(seasonOf("2026-01")).toBe("winter");
    expect(seasonOf("2026-02")).toBe("winter");
  });
});

describe("day math", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-09-22", 18)).toBe("2026-10-10");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-09-25", 0)).toBe("2026-09-25");
  });

  it("counts days between dates with sign (LPG cycle anchors)", () => {
    expect(daysBetween("2026-08-01", "2026-08-26")).toBe(25);
    expect(daysBetween("2026-08-27", "2026-09-21")).toBe(25);
    expect(daysBetween("2026-09-22", "2026-10-10")).toBe(18);
    expect(daysBetween("2026-10-10", "2026-09-22")).toBe(-18);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("knows month bounds and lengths", () => {
    expect(startOfMonth("2026-02")).toBe("2026-02-01");
    expect(endOfMonth("2026-02")).toBe("2026-02-28");
    expect(endOfMonth("2028-02")).toBe("2028-02-29");
    expect(daysInMonth("2026-09")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("formats a local Date as an ISO date", () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe("2026-09-05");
    expect(toIsoDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("parses date-only strings as local midnight", () => {
    const d = parseIso("2026-09-25");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
  });
});

describe("clock strings", () => {
  it("formats 24h times as 12h with meridiem", () => {
    expect(formatTime("07:00")).toBe("7:00 AM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("19:30")).toBe("7:30 PM");
  });

  it("collapses the meridiem in same-half ranges", () => {
    expect(timeRange("07:00", "08:00")).toBe("7:00–8:00 AM");
    expect(timeRange("07:00", "08:15")).toBe("7:00–8:15 AM");
    expect(timeRange("11:30", "13:00")).toBe("11:30 AM–1:00 PM");
  });

  it("does minute arithmetic", () => {
    expect(minutesBetween("07:12", "07:42")).toBe(30);
    expect(minutesBetween("23:30", "00:30")).toBe(60);
    expect(addMinutes("07:00", 75)).toBe("08:15");
    expect(addMinutes("23:50", 20)).toBe("00:10");
  });
});

describe("relativeTime", () => {
  const now = "2026-09-25T10:00:00";

  it("uses the spec phrasing for recent times", () => {
    expect(relativeTime("2026-09-25T09:59:40", now)).toBe("Just now");
    expect(relativeTime("2026-09-25T09:55:00", now)).toBe("5 min ago");
    expect(relativeTime("2026-09-25T09:00:00", now)).toBe("1h ago");
    expect(relativeTime("2026-09-25T04:30:00", now)).toBe("5h ago");
    expect(relativeTime("2026-09-24T09:00:00", now)).toBe("1 day ago");
    expect(relativeTime("2026-09-23T10:00:00", now)).toBe("2 days ago");
    expect(relativeTime("2026-09-11T10:00:00", now)).toBe("2 weeks ago");
    expect(relativeTime("2026-07-20T10:00:00", now)).toBe("2 months ago");
  });

  it("phrases future times", () => {
    expect(relativeTime("2026-09-25T10:05:00", now)).toBe("In 5 min");
    expect(relativeTime("2026-09-27T10:00:00", now)).toBe("In 2 days");
  });
});
