import { describe, expect, it } from "vitest";
import { CARBON_STRATEGIES, EMISSION_FACTORS } from "@/data/catalogue/emissionFactors";
import { computeCarbon, rankStrategies, type CarbonComputeInput } from "./carbon";

/** H-1024-like profile: 390 kWh, ≈ 17 kg LPG a month, 640 L/day, two-wheeler commute, vegetarian. */
function typicalProfile(): CarbonComputeInput {
  return {
    householdId: "H-1024",
    commuteMode: "two_wheeler",
    kmPerWeek: 60,
    diet: "vegetarian",
    flightsPerYear: 1,
    shopping: "medium",
    updatedAt: "2026-09-25T10:00:00.000Z",
    kwhPerMonth: 390,
    lpgKgPerMonth: 17.1,
    litresPerDay: 640,
    people: 4,
  };
}

describe("computeCarbon", () => {
  const r = computeCarbon(typicalProfile());

  it("lands a typical family at 2–4 tCO₂e per person with the factors listed", () => {
    expect(r.householdId).toBe("H-1024");
    expect(r.perPersonTco2e).toBeGreaterThanOrEqual(2);
    expect(r.perPersonTco2e).toBeLessThanOrEqual(4);
    expect(r.tco2e).toBeCloseTo(r.perPersonTco2e * 4, 1);
    expect(r.comparison).toEqual({ cityAvgTco2e: 1.6, areaAvgTco2e: 1.7, indiaAvgTco2e: 1.9 });
    expect(r.confidence).toBe("High");
    expect(r.factorsUsed.length).toBeGreaterThanOrEqual(7 + EMISSION_FACTORS.sources.length);
    expect(r.factorsUsed.some((f) => Boolean(f.value && /0\.716/.test(f.value)))).toBe(true);
  });

  it("breaks the total down by component with shares summing to 1", () => {
    expect(r.breakdown.map((b) => b.key)).toEqual([
      "electricity",
      "lpg",
      "water",
      "commute",
      "diet",
      "flights",
      "shopping",
    ]);
    const byKey = Object.fromEntries(r.breakdown.map((b) => [b.key, b.tco2e]));
    expect(byKey.electricity).toBeCloseTo((390 * 12 * 0.716) / 1000, 2); // 3.35
    expect(byKey.lpg).toBeCloseTo((17.1 * 12 * 2.98) / 1000, 2); // 0.61
    expect(byKey.water).toBeCloseTo((640 * 365 * 0.0003) / 1000, 2); // 0.07
    expect(byKey.commute).toBeCloseTo((60 * 52 * 0.06) / 1000, 2); // 0.19
    expect(byKey.diet).toBeCloseTo(1.1 * 4, 2);
    expect(byKey.flights).toBe(0.15);
    expect(byKey.shopping).toBe(0.7);
    const shareSum = r.breakdown.reduce((acc, b) => acc + b.share, 0);
    expect(shareSum).toBeCloseTo(1, 2);
    expect(r.tco2e).toBeCloseTo(
      r.breakdown.reduce((acc, b) => acc + b.tco2e, 0),
      1,
    );
  });

  it("ranks strategies by estimated reduction, only for categories with emissions, worded 'may reduce'", () => {
    expect(r.strategies.length).toBeGreaterThan(0);
    for (let i = 1; i < r.strategies.length; i += 1) {
      const prev = r.strategies[i - 1];
      const curr = r.strategies[i];
      expect((prev.reductionTco2eLow + prev.reductionTco2eHigh) / 2).toBeGreaterThanOrEqual(
        (curr.reductionTco2eLow + curr.reductionTco2eHigh) / 2,
      );
      expect(curr.reductionTco2eLow).toBeLessThanOrEqual(curr.reductionTco2eHigh);
    }
    expect(r.strategies[0].id).toBe("cs-rooftop-solar");
    expect(r.strategies.every((s) => /may (reduce|remove|generate)|cuts|shifts/.test(s.description))).toBe(true);
    expect(r.strategies.map((s) => s.id)).toContain("cs-flights-train");
  });

  it("drops strategies for zero categories and caps reductions at the category's emissions", () => {
    const noFlights = computeCarbon({ ...typicalProfile(), flightsPerYear: 0, commuteMode: "walk_cycle" });
    expect(noFlights.strategies.map((s) => s.id)).not.toContain("cs-flights-train");
    expect(noFlights.strategies.map((s) => s.category)).not.toContain("commute");
    const tiny = rankStrategies(
      { electricity: 0.05, lpg: 0, water: 0, commute: 0, diet: 0, flights: 0, shopping: 0 },
      CARBON_STRATEGIES,
    );
    expect(tiny.every((s) => s.category === "electricity")).toBe(true);
    expect(tiny.every((s) => s.reductionTco2eHigh <= 0.05)).toBe(true);
  });

  it("lowers confidence when utilities are missing and defaults people to 1", () => {
    const r2 = computeCarbon({ ...typicalProfile(), kwhPerMonth: 0, lpgKgPerMonth: 0, litresPerDay: 0, people: undefined });
    expect(r2.confidence).toBe("Low");
    expect(r2.perPersonTco2e).toBe(r2.tco2e);
    const r3 = computeCarbon({ ...typicalProfile(), lpgKgPerMonth: 0 });
    expect(r3.confidence).toBe("Medium");
  });
});
