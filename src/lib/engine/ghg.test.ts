import { describe, expect, it } from "vitest";
import type { GhgActivity } from "@/types";
import { EMISSION_THRESHOLDS_DEFAULT } from "@/data/catalogue/thresholds";
import {
  classifyEmissions,
  classifyPollutant,
  computeGhg,
  ghgMonthlyTotals,
  ghgOpportunities,
} from "./ghg";

const activity: GhgActivity[] = [
  { unitId: "ind-03", month: "2026-08", dieselLitres: 9_000, electricityKwh: 110_000, naturalGasScm: 4_000, processTonnes: 380 },
  { unitId: "ind-03", month: "2026-09", dieselLitres: 10_000, electricityKwh: 120_000, naturalGasScm: 5_000, processTonnes: 400 },
  { unitId: "ind-01", month: "2026-09", dieselLitres: 2_000, electricityKwh: 60_000, naturalGasScm: 0, processTonnes: 0 },
];

describe("computeGhg", () => {
  const inventories = computeGhg(activity);

  it("multiplies activity data by the demo factors and splits by scope", () => {
    const sep = inventories.find((i) => i.unitId === "ind-03" && i.month === "2026-09");
    expect(sep).toBeDefined();
    // Scope 1 = 10,000 L × 2.68 + 5,000 scm × 2.0 (kg → t) + 400 t × 0.85 = 26.8 + 10 + 340
    expect(sep?.scope1).toBeCloseTo(376.8, 2);
    // Scope 2 = 120,000 kWh × 0.716 kg = 85.92 t
    expect(sep?.scope2).toBeCloseTo(85.92, 2);
    // Scope 3 = 20 % of process (illustrative) = 68 t
    expect(sep?.scope3).toBeCloseTo(68, 2);
    expect(sep?.total).toBeCloseTo(530.72, 2);
    expect(sep?.breakdown.map((b) => [b.key, b.scope])).toEqual([
      ["diesel", 1],
      ["naturalGas", 1],
      ["process", 1],
      ["electricity", 2],
      ["valueChain", 3],
    ]);
    expect(sep?.breakdown.find((b) => b.key === "valueChain")?.label).toMatch(/illustrative/);
  });

  it("returns one inventory per unit-month, sorted by unit then month", () => {
    expect(inventories.map((i) => `${i.unitId}/${i.month}`)).toEqual([
      "ind-01/2026-09",
      "ind-03/2026-08",
      "ind-03/2026-09",
    ]);
    const small = inventories[0];
    expect(small.scope1).toBeCloseTo(5.36, 2);
    expect(small.scope3).toBe(0);
  });

  it("aggregates a monthly trend across units", () => {
    const trend = ghgMonthlyTotals(inventories);
    expect(trend.map((t) => t.month)).toEqual(["2026-08", "2026-09"]);
    expect(trend[1].units).toBe(2);
    expect(trend[1].total).toBeCloseTo(530.72 + 5.36 + 42.96, 1);
    expect(trend[1].scope2).toBeCloseTo(85.92 + 42.96, 2);
  });
});

describe("classifyEmissions", () => {
  it("classifies one pollutant against its threshold pair", () => {
    const t = EMISSION_THRESHOLDS_DEFAULT.pm; // elevated 100 · exceedance 150
    expect(classifyPollutant(74, t)).toBe("within");
    expect(classifyPollutant(100, t)).toBe("elevated");
    expect(classifyPollutant(149, t)).toBe("elevated");
    expect(classifyPollutant(150, t)).toBe("exceedance");
  });

  it("takes the worst status across PM, SO₂ and NOx", () => {
    expect(classifyEmissions({ pm: 40, so2: 30, nox: 50 }, EMISSION_THRESHOLDS_DEFAULT)).toBe("within");
    expect(classifyEmissions({ pm: 40, so2: 90, nox: 50 }, EMISSION_THRESHOLDS_DEFAULT)).toBe("elevated");
    expect(classifyEmissions({ pm: 148, so2: 62, nox: 130 }, EMISSION_THRESHOLDS_DEFAULT)).toBe("exceedance");
    // Unit-specific (tighter) thresholds, as the seed configures for ind-03.
    expect(
      classifyEmissions(
        { pm: 148, so2: 62, nox: 88 },
        { pm: { elevated: 80, exceedance: 140 }, so2: { elevated: 80, exceedance: 120 }, nox: { elevated: 80, exceedance: 120 } },
      ),
    ).toBe("exceedance");
  });
});

describe("ghgOpportunities", () => {
  const inventories = computeGhg(activity);

  it("ranks up to four generic levers by estimated annual reduction, worded 'may reduce'", () => {
    const ops = ghgOpportunities(inventories);
    expect(ops.length).toBe(4);
    expect(ops.map((o) => o.title)).toEqual([
      "Waste heat recovery",
      "Diesel genset → grid/solar hybrid",
      "Shift 20 % of process load to off-peak grid",
      "Boiler tune-up",
    ]);
    for (let i = 1; i < ops.length; i += 1) {
      const mid = (o: (typeof ops)[number]): number => (o.reductionTco2eLow + o.reductionTco2eHigh) / 2;
      expect(mid(ops[i - 1])).toBeGreaterThanOrEqual(mid(ops[i]));
    }
    expect(ops.every((o) => /may reduce/.test(o.description))).toBe(true);
    expect(ops.every((o) => o.reductionTco2eLow <= o.reductionTco2eHigh)).toBe(true);
    expect(ops.every((o) => o.unitId === undefined)).toBe(true);
    // Waste heat: (340 process + 10 gas) × 12 × 8–15 % = 336–630 tCO₂e/yr
    expect(ops[0].reductionTco2eLow).toBeCloseTo(336, 0);
    expect(ops[0].reductionTco2eHigh).toBeCloseTo(630, 0);
  });

  it("scopes to one unit and omits levers with nothing to reduce", () => {
    const ops = ghgOpportunities(inventories, "ind-01");
    expect(ops.every((o) => o.unitId === "ind-01")).toBe(true);
    expect(ops.map((o) => o.id)).not.toContain("ghg-waste-heat");
    expect(ops.map((o) => o.id)).toContain("ghg-diesel-hybrid");
    expect(ghgOpportunities([], "ind-99")).toEqual([]);
  });
});
