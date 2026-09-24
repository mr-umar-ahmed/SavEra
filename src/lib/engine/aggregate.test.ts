import { describe, expect, it } from "vitest";
import type { AreaAggregate, Ward, Zone } from "@/types";
import {
  areaTrend,
  combineAggregates,
  cylinderRequirement,
  forecastDemand,
  linearFit,
  pctVsBaseline,
  rollup,
  statusVsBaseline,
} from "./aggregate";

describe("statusVsBaseline", () => {
  it("applies the ≤ 5 % / 5–15 % / > 15 % bands", () => {
    expect(statusVsBaseline(4300, 4250, "lpg")).toBe("normal"); // +1.2 %
    expect(statusVsBaseline(4400, 4100, "lpg")).toBe("higher"); // +7.3 %
    expect(statusVsBaseline(4900, 4100, "lpg")).toBe("significantly_higher"); // +19.5 %
    expect(statusVsBaseline(11_800_000, 10_900_000, "water")).toBe("higher"); // +8.3 %
    expect(statusVsBaseline(105, 100, "water")).toBe("normal");
    expect(statusVsBaseline(115, 100, "electricity")).toBe("higher");
    expect(statusVsBaseline(90, 100, "water")).toBe("normal");
  });

  it("treats a missing baseline as normal and reports the percentage", () => {
    expect(statusVsBaseline(500, 0, "water")).toBe("normal");
    expect(pctVsBaseline(4900, 4100)).toBe(19.5);
    expect(pctVsBaseline(100, 0)).toBe(0);
  });
});

describe("forecastDemand", () => {
  it("projects 58,000 / 61,000 / 63,000 kg to ≈ 66,000 kg", () => {
    const f = forecastDemand([58_000, 61_000, 63_000]);
    expect(f).toBeGreaterThanOrEqual(64_500);
    expect(f).toBeLessThanOrEqual(67_500);
  });

  it("projects the city LPG history 50k / 53k / 56k / 58k to ≈ 60,000 kg", () => {
    const f = forecastDemand([50_000, 53_000, 56_000, 58_000]);
    expect(f).toBeGreaterThanOrEqual(58_000);
    expect(f).toBeLessThanOrEqual(62_000);
  });

  it("uses only the last four points, applies the seasonal factor and never goes negative", () => {
    expect(forecastDemand([1, 1, 1, 100, 100, 100, 100])).toBe(100);
    expect(forecastDemand([100, 100, 100], 1.1)).toBe(110);
    expect(forecastDemand([100, 50, 0])).toBe(0);
    expect(forecastDemand([42])).toBe(42);
    expect(forecastDemand([])).toBe(0);
  });

  it("fits a line through evenly spaced points", () => {
    expect(linearFit([2, 4, 6])).toEqual({ slope: 2, intercept: 2 });
    expect(linearFit([5])).toEqual({ slope: 0, intercept: 5 });
  });
});

describe("cylinderRequirement", () => {
  it("is ceil(kg ÷ 14.2 × 1.05)", () => {
    // Area B: 4,300 cylinders ≈ 58,150 kg this month → 62,880 kg predicted → 4,650 cylinders.
    expect(cylinderRequirement(58_150)).toBe(4_300);
    expect(cylinderRequirement(62_880)).toBe(4_650);
    // Ward forecast 66,000 kg ≈ 4,880 · city forecast 60,000 kg ≈ 4,440.
    expect(cylinderRequirement(66_000)).toBe(4_881);
    expect(cylinderRequirement(60_000)).toBe(4_437);
    expect(cylinderRequirement(0)).toBe(0);
  });
});

describe("areaTrend", () => {
  it("returns the fractional per-period slope, clamped, and 0 without history", () => {
    expect(areaTrend([58_000, 61_000, 63_000])).toBeCloseTo(0.0412, 3);
    expect(areaTrend([100, 100, 100])).toBe(0);
    expect(areaTrend([100, 90, 80])).toBeCloseTo(-0.1111, 3);
    expect(areaTrend([1, 1000])).toBe(0.5);
    expect(areaTrend([7])).toBe(0);
    expect(areaTrend([])).toBe(0);
  });
});

function area(
  areaId: string,
  wardId: string,
  zoneId: string,
  totalConsumption: number,
  baseline: number,
  extra: Partial<AreaAggregate> = {},
): AreaAggregate {
  return {
    areaId,
    wardId,
    zoneId,
    stream: "lpg",
    month: "2026-09",
    unit: "kg",
    totalConsumption,
    activeHouseholds: 100,
    totalHouseholds: 120,
    avgPerHousehold: totalConsumption / 100,
    baseline,
    status: statusVsBaseline(totalConsumption, baseline, "lpg"),
    demand: totalConsumption,
    forecast: totalConsumption * 1.05,
    aboveBaselineHouseholds: 10,
    trendPct: 5,
    ...extra,
  };
}

const geoWard = (id: string, number: number, zoneId: string): Ward => ({
  id,
  number,
  name: `Ward ${number}`,
  zoneId,
  areaIds: [],
  polygon: [],
  centroid: [16.2, 77.35],
  householdCount: 600,
  participatingHouseholds: 400,
});

const geoZone = (id: string, name: string, wardIds: string[]): Zone => ({
  id,
  name,
  wardIds,
  polygon: [],
  centroid: [16.2, 77.35],
});

describe("rollup", () => {
  const aggs: AreaAggregate[] = [
    area("area-xyz", "ward-24", "zone-3", 4300, 4250),
    area("area-abc", "ward-24", "zone-3", 4900, 4100, { trendPct: 19.5 }),
    area("area-def", "ward-24", "zone-3", 3950, 3900),
    area("area-ghi", "ward-24", "zone-3", 4050, 3300),
    area("area-w18-1", "ward-18", "zone-2", 3000, 2950),
    area("area-w18-2", "ward-18", "zone-2", 3100, 3050),
  ];
  const geo = {
    wards: [geoWard("ward-18", 18, "zone-2"), geoWard("ward-24", 24, "zone-3")],
    zones: [geoZone("zone-2", "Zone 2 · Central", ["ward-18"]), geoZone("zone-3", "Zone 3 · South", ["ward-24"])],
  };
  const r = rollup(aggs, geo);

  it("sums areas into wards with a weighted average and a status vs the summed baseline", () => {
    expect(r.wards.map((w) => w.wardId)).toEqual(["ward-18", "ward-24"]);
    const w24 = r.wards[1];
    expect(w24.zoneId).toBe("zone-3");
    expect(w24.areas).toHaveLength(4);
    expect(w24.totalConsumption).toBe(17_200);
    expect(w24.baseline).toBe(15_550);
    expect(w24.activeHouseholds).toBe(400);
    expect(w24.totalHouseholds).toBe(480);
    expect(w24.avgPerHousehold).toBe(43);
    expect(w24.aboveBaselineHouseholds).toBe(40);
    expect(w24.status).toBe("higher"); // +10.6 %
    expect(w24.trendPct).toBeGreaterThan(5);
    expect(w24.trendPct).toBeLessThan(19.5);
  });

  it("rolls wards into zones and zones into the city, keeping stream and month", () => {
    expect(r.zones.map((z) => z.zoneId)).toEqual(["zone-2", "zone-3"]);
    expect(r.zones[1].wards.map((w) => w.wardId)).toEqual(["ward-24"]);
    expect(r.city.zones).toHaveLength(2);
    expect(r.city.totalConsumption).toBe(23_300);
    expect(r.city.baseline).toBe(21_550);
    expect(r.city.stream).toBe("lpg");
    expect(r.city.month).toBe("2026-09");
    expect(r.city.unit).toBe("kg");
    expect(r.city.status).toBe("higher");
  });

  it("never carries household identifiers — only counts and totals", () => {
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/H-\d{4}/);
    expect(json).not.toMatch(/householdId/);
  });

  it("handles an empty input", () => {
    const empty = rollup([], geo);
    expect(empty.wards).toEqual([]);
    expect(empty.zones).toEqual([]);
    expect(empty.city.totalConsumption).toBe(0);
    expect(empty.city.status).toBe("normal");
  });

  it("combineAggregates guards a zero denominator", () => {
    const c = combineAggregates([area("a", "w", "z", 0, 0, { activeHouseholds: 0, trendPct: 3 })], {
      stream: "water",
      month: "2026-09",
      unit: "L",
    });
    expect(c.avgPerHousehold).toBe(0);
    expect(c.trendPct).toBe(3);
    expect(c.status).toBe("normal");
  });
});
