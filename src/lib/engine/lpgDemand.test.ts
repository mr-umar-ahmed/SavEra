import { describe, expect, it } from "vitest";

import { rollup } from "./aggregate";
import { cylinderUsedPct, forecastLpgDemand, lpgSeasonalFactor, refillWindow } from "./lpgDemand";
import { lpgAreaHistory, lpgCityHistory, seedLpgAreaAggregates } from "@/data/seed/lpgAggregates";
import { WARDS, ZONES } from "@/data/geo/raichur";

const NOW = "2026-09-25";

describe("lpgSeasonalFactor", () => {
  it("raises October (festival season) and lowers May (summer)", () => {
    expect(lpgSeasonalFactor("2026-10")).toBe(1.035);
    expect(lpgSeasonalFactor("2027-05")).toBe(0.96);
  });
});

describe("forecastLpgDemand", () => {
  it("city: 50k · 53k · 54k · 56k → ≈ 60,000 kg and ≈ 4,440 cylinders for October", () => {
    const f = forecastLpgDemand([50000, 53000, 54000, 56000], "2026-10");
    expect(f.kg).toBe(60030);
    expect(f.cylinders).toBe(4439);
    expect(f.low).toBeLessThan(f.kg);
    expect(f.high).toBeGreaterThan(f.kg);
    expect(f.basisMonths).toBe(4);
  });

  it("Ward 24: 14.9k · 15.7k · 16.0k · 17.2k → ≈ 1,360 cylinders", () => {
    const f = forecastLpgDemand([14900, 15700, 16000, 17200], "2026-10");
    expect(f.cylinders).toBe(1359);
    expect(f.changePct).toBeGreaterThan(0);
  });
});

describe("refillWindow / cylinderUsedPct", () => {
  it("widens the window with lower confidence", () => {
    expect(refillWindow("2026-10-02", "Medium")).toEqual({
      earliest: "2026-09-30",
      latest: "2026-10-04",
      days: 2,
    });
    expect(refillWindow("2026-10-02", "Low").days).toBe(4);
  });

  it("computes the used share of a cylinder", () => {
    expect(cylinderUsedPct(14.2, 4)).toBe(72);
    expect(cylinderUsedPct(14.2, 20)).toBe(0);
  });
});

describe("seeded LPG aggregates", () => {
  const aggs = seedLpgAreaAggregates(NOW);
  const byId = Object.fromEntries(aggs.map((a) => [a.areaId, a]));

  it("matches the Ward 24 area anchors", () => {
    expect(byId["area-xyz"].totalConsumption).toBe(4300);
    expect(byId["area-abc"].totalConsumption).toBe(4900);
    expect(byId["area-abc"].baseline).toBe(4100);
    expect(byId["area-abc"].status).toBe("significantly_higher");
    expect(byId["area-ghi"].status).toBe("significantly_higher");
    expect(byId["area-def"].status).toBe("normal");
    const w24 = aggs.filter((a) => a.wardId === "ward-24");
    expect(w24.reduce((s, a) => s + a.totalConsumption, 0)).toBe(17200);
    expect(w24.reduce((s, a) => s + a.totalHouseholds, 0)).toBe(1240);
    expect(w24.reduce((s, a) => s + a.activeHouseholds, 0)).toBe(1085);
    expect(w24.reduce((s, a) => s + a.aboveBaselineHouseholds, 0)).toBe(63);
  });

  it("rolls up to the city anchors and zone / ward statuses", () => {
    const { city, zones, wards } = rollup(aggs, { wards: WARDS, zones: ZONES });
    expect(city.totalConsumption).toBe(56000);
    expect(city.activeHouseholds).toBe(4120);
    const zone = (id: string) => zones.find((z) => z.zoneId === id)!;
    expect(zone("zone-1").status).toBe("normal");
    expect(zone("zone-2").status).toBe("higher");
    expect(zone("zone-3").status).toBe("significantly_higher");
    const ward = (id: string) => wards.find((w) => w.wardId === id)!;
    expect(ward("ward-24").status).toBe("higher");
    expect(ward("ward-18").status).toBe("normal");
    expect(ward("ward-11").status).toBe("normal");
    expect(ward("ward-07").status).toBe("higher");
  });

  it("history series end at the current month and sum to the city series", () => {
    const history = lpgAreaHistory(NOW);
    const city = lpgCityHistory(NOW);
    expect(city.at(-1)).toEqual({ month: "2026-09", kg: 56000 });
    expect(history["area-abc"].at(-1)).toEqual({ month: "2026-09", kg: 4900 });
    expect(history["area-abc"].at(-2)?.kg).toBe(4200);
    for (let i = 0; i < city.length; i++) {
      const sum = Object.values(history).reduce((s, series) => s + series[i].kg, 0);
      expect(Math.abs(sum - city[i].kg)).toBeLessThanOrEqual(200);
    }
  });
});
