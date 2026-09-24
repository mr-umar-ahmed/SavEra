import { describe, expect, it } from "vitest";
import type { LpgCylinder } from "@/types";
import { H1024_ANCHORS, H1024_ID, H1024_LPG } from "@/data/fixtures/h1024";
import { H1088_ID, H1088_LPG, H1088_LPG_EXPECTED } from "@/data/fixtures/h1088";
import { lpgCylindersFromSpec } from "@/data/fixtures/shared";
import { addDays } from "@/lib/dates";
import { LPG_GUIDANCE, LPG_POSSIBLE_REASONS_HIGHER, analyzeLpg, median, typicalRangeOf } from "./lpg";

const NOW = "2026-10-10";

describe("helpers", () => {
  it("computes the median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("builds the typical band 0.55–0.60 around 0.568 kg/day", () => {
    expect(typicalRangeOf(14.2 / 25)).toEqual({ low: 0.55, high: 0.6 });
    expect(typicalRangeOf(0.5)).toEqual({ low: 0.48, high: 0.52 });
  });
});

describe("analyzeLpg — H-1024 (normal)", () => {
  const cylinders = lpgCylindersFromSpec(H1024_ID, H1024_LPG, NOW);
  const r = analyzeLpg(cylinders, NOW);

  it("derives two 25-day cycles at ≈ 0.57 kg/day and a typical band of 0.55–0.60", () => {
    expect(r.householdId).toBe(H1024_ID);
    expect(r.cycles).toHaveLength(2);
    expect(r.cycles.map((c) => c.days)).toEqual([25, 25]);
    expect(r.cycles[0].kgPerDay).toBeCloseTo(0.568, 3);
    expect(r.typicalKgPerDay).toBe(0.57);
    expect(r.typicalRange).toEqual({
      low: H1024_ANCHORS.lpgTypicalKgPerDay.low,
      high: H1024_ANCHORS.lpgTypicalKgPerDay.high,
    });
    expect(r.typicalDaysPerCylinder).toBe(25);
  });

  it("tracks the current cylinder: 18 days used, 0.57 kg/day, ≈ 7 days remaining, refill now + 7", () => {
    expect(r.current?.cylinderId).toBe("cyl-1024-3");
    expect(r.current?.daysUsed).toBe(18);
    expect(r.current?.projectedKgPerDay).toBe(H1024_ANCHORS.lpgCurrentKgPerDay);
    expect(r.currentKgPerDay).toBe(0.57);
    expect(r.current?.estimatedRemainingDays).toBe(7);
    expect(r.current?.estimatedRemainingKg).toBeCloseTo(4.0, 1);
    expect(r.refill?.date).toBe(addDays(NOW, 7));
    expect(r.refill?.date).toBe("2026-10-17");
    expect(r.refill?.daysFromNow).toBe(7);
    expect(r.refill?.basis).toBe("Based on your typical usage of 0.57 kg/day over the last 2 cylinders");
  });

  it("is Normal with Medium confidence and no possible reasons, but always carries the guidance", () => {
    expect(r.status).toBe("normal");
    expect(r.deltaPct).toBe(0);
    expect(r.confidence).toBe("Medium");
    expect(r.possibleReasons).toEqual([]);
    expect(r.guidance).toEqual([...LPG_GUIDANCE]);
    expect(r.guidance).toHaveLength(10);
    expect(r.guidance[0]).toMatch(/Check for gas smell/);
    expect(r.inputs.some((i) => i.label === "Finished cylinders" && i.value === "2")).toBe(true);
  });

  it("is stable for any demo date because the fixture is relative to now", () => {
    const other = "2027-03-05";
    const again = analyzeLpg(lpgCylindersFromSpec(H1024_ID, H1024_LPG, other), other);
    expect(again.current?.daysUsed).toBe(18);
    expect(again.current?.estimatedRemainingDays).toBe(7);
    expect(again.status).toBe("normal");
  });
});

describe("analyzeLpg — H-1088 (higher consumption)", () => {
  const cylinders = lpgCylindersFromSpec(H1088_ID, H1088_LPG, NOW);
  const r = analyzeLpg(cylinders, NOW);

  it("flags the higher pattern after ≥ 5 elapsed days with the safety-first possible reasons", () => {
    expect(r.cycles).toHaveLength(4);
    expect(r.typicalKgPerDay).toBe(H1088_LPG_EXPECTED.typicalKgPerDay);
    expect(r.cycles.at(-1)?.days).toBe(H1088_LPG_EXPECTED.lastCycleDays);
    expect(r.cycles.at(-1)?.kgPerDay).toBeCloseTo(H1088_LPG_EXPECTED.lastCycleKgPerDay, 1);
    expect(r.current?.daysUsed).toBe(H1088_LPG_EXPECTED.currentDaysUsed);
    expect(r.status).toBe("higher");
    expect(r.currentKgPerDay).toBeGreaterThan((r.typicalKgPerDay ?? 0) * 1.2);
    expect(r.deltaPct).toBeGreaterThan(20);
    expect(r.possibleReasons).toEqual([...LPG_POSSIBLE_REASONS_HIGHER]);
    expect(r.possibleReasons).toContain("Possible leakage — check for safety");
    expect(r.possibleReasons.join(" ")).not.toMatch(/leak detected|faulty|broken/i);
    expect(r.confidence).toBe("High");
    expect(r.refill?.basis).toMatch(/^Based on a blended rate of 0\.70 kg\/day/);
    expect(r.current?.estimatedRemainingDays).toBeLessThan(20);
  });

  it("does not flag the current cylinder before 5 elapsed days", () => {
    const early = "2026-10-08"; // cylinder 5 started 6 days before 2026-10-10 → 4 days before this date
    const shifted = lpgCylindersFromSpec(H1088_ID, H1088_LPG, NOW);
    const r2 = analyzeLpg(shifted, early);
    expect(r2.current?.daysUsed).toBe(4);
    expect(r2.status).toBe("normal");
  });
});

describe("analyzeLpg — sparse data", () => {
  it("reports insufficient data with a Low-confidence fallback projection for a first cylinder", () => {
    const only: LpgCylinder[] = [
      {
        id: "cyl-new",
        householdId: "H-9",
        sizeKg: 14.2,
        refillDate: "2026-10-01",
        startDate: "2026-10-02",
        provider: "LPG Distribution Cell",
        source: "manual",
      },
    ];
    const r = analyzeLpg(only, NOW);
    expect(r.status).toBe("insufficient_data");
    expect(r.confidence).toBe("Low");
    expect(r.typicalKgPerDay).toBeUndefined();
    expect(r.cycles).toEqual([]);
    expect(r.current?.daysUsed).toBe(8);
    expect(r.current?.projectedKgPerDay).toBeCloseTo(14.2 / 30, 2);
    expect(r.refill?.basis).toMatch(/assumed 30-day cylinder/);
    expect(r.refill?.daysFromNow).toBe(22);
  });

  it("returns an empty analysis for no cylinders", () => {
    const r = analyzeLpg([], NOW);
    expect(r.status).toBe("insufficient_data");
    expect(r.current).toBeUndefined();
    expect(r.refill).toBeUndefined();
    expect(r.guidance).toHaveLength(10);
  });

  it("uses the typical rate alone with a single finished cycle and clamps overdue cylinders to today", () => {
    const cylinders: LpgCylinder[] = [
      {
        id: "c1",
        householdId: "H-8",
        sizeKg: 14.2,
        refillDate: "2026-07-31",
        startDate: "2026-08-01",
        finishDate: "2026-08-21",
        provider: "LPG Distribution Cell",
        source: "manual",
      },
      {
        id: "c2",
        householdId: "H-8",
        sizeKg: 14.2,
        refillDate: "2026-08-21",
        startDate: "2026-08-22",
        provider: "LPG Distribution Cell",
        source: "manual",
      },
    ];
    const r = analyzeLpg(cylinders, NOW);
    expect(r.confidence).toBe("Medium");
    expect(r.typicalKgPerDay).toBe(0.71);
    expect(r.currentKgPerDay).toBe(0.71);
    expect(r.refill?.basis).toBe("Based on your typical usage of 0.71 kg/day over the last 1 cylinder");
    expect(r.current?.daysUsed).toBe(49);
    expect(r.current?.estimatedRemainingDays).toBe(0);
    expect(r.current?.estimatedRemainingKg).toBe(0);
    expect(r.refill?.date).toBe(NOW);
    expect(r.refill?.daysFromNow).toBe(0);
  });
});
