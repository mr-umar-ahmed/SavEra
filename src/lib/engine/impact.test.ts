import { describe, expect, it } from "vitest";
import {
  communityImpact,
  formatInrCompact,
  HERO_IMPACT,
  householdSavings,
  IMPACT_ANCHORS,
  kwhFromBill,
  savingsFromBill,
} from "./impact";
import { computeBill } from "./tariff";

describe("Impact engine — illustrative savings (landing + onboarding)", () => {
  it("household savings at the Ward 24 peer average sit in the expected band", () => {
    const s = householdSavings(340);
    expect(s.monthlyKwh).toBe(340);
    expect(s.monthlyBill).toBe(computeBill(340).total);
    expect(s.reductionPctLow).toBe(8);
    expect(s.reductionPctHigh).toBe(12);
    expect(s.kwhLow).toBeCloseTo(27.2, 1);
    expect(s.kwhHigh).toBeCloseTo(40.8, 1);
    // ≈ ₹7.85 per unit saved above 200 units (catalogue/tariff.ts) → ₹213 / ₹320
    expect(s.rupeeLow).toBeGreaterThanOrEqual(195);
    expect(s.rupeeLow).toBeLessThanOrEqual(235);
    expect(s.rupeeHigh).toBeGreaterThanOrEqual(295);
    expect(s.rupeeHigh).toBeLessThanOrEqual(345);
    expect(s.yearlyRupeeLow).toBe(s.rupeeLow * 12);
    expect(s.yearlyRupeeHigh).toBe(s.rupeeHigh * 12);
    expect(s.yearlyKwhLow).toBe(Math.round(s.kwhLow * 12));
    expect(s.co2KgHigh).toBeGreaterThan(s.co2KgLow);
    expect(s.co2KgLow).toBe(Math.round(s.kwhLow * 12 * IMPACT_ANCHORS.gridKgPerKwh));
  });

  it("is slab-aware and monotonic in consumption", () => {
    const a = householdSavings(340);
    const b = householdSavings(390);
    expect(b.rupeeHigh).toBeGreaterThan(a.rupeeHigh);
    expect(b.kwhLow).toBeGreaterThan(a.kwhLow);
    const zero = householdSavings(0);
    expect(zero.kwhLow).toBe(0);
    expect(zero.rupeeLow).toBe(0);
    expect(zero.rupeeHigh).toBe(0);
  });

  it("clamps the reduction band into 0–100 % and keeps high ≥ low", () => {
    const s = householdSavings(300, 150, 5);
    expect(s.reductionPctLow).toBe(100);
    expect(s.reductionPctHigh).toBe(100);
    expect(s.kwhLow).toBe(300);
    expect(s.rupeeHigh).toBeGreaterThanOrEqual(s.rupeeLow);
  });

  it("inverts the demo tariff: kwhFromBill(bill(k)) ≈ k", () => {
    for (const k of [40, 120, 200, 350, 390, 430, 900]) {
      const bill = computeBill(k).total;
      expect(Math.abs(kwhFromBill(bill) - k)).toBeLessThanOrEqual(1);
    }
    expect(kwhFromBill(0)).toBe(0);
    expect(kwhFromBill(computeBill(0).total)).toBe(0);
    expect(kwhFromBill(Number.NaN)).toBe(0);
  });

  it("savingsFromBill(3120) reconstructs the 390 kWh anchor", () => {
    const s = savingsFromBill(3120);
    expect(s.monthlyKwh).toBeGreaterThanOrEqual(386);
    expect(s.monthlyKwh).toBeLessThanOrEqual(392);
    expect(s.rupeeLow).toBeGreaterThan(0);
  });

  it("community totals are 12 × per-household × households", () => {
    const per = householdSavings(340);
    const c = communityImpact(5000, 340);
    expect(c.households).toBe(5000);
    expect(c.yearlyRupeeLow).toBe(per.yearlyRupeeLow * 5000);
    expect(c.yearlyRupeeHigh).toBe(per.yearlyRupeeHigh * 5000);
    expect(c.yearlyKwhLow).toBe(Math.round(per.yearlyKwhLow * 5000));
    expect(c.co2TonnesLow).toBeCloseTo((c.yearlyKwhLow * IMPACT_ANCHORS.gridKgPerKwh) / 1000, 1);
    expect(c.co2TonnesHigh).toBeGreaterThan(c.co2TonnesLow);
    // Order of magnitude for the hero: ₹1–2 crore per year across the seeded pilot.
    expect(c.yearlyRupeeLow).toBeGreaterThan(1e7);
    expect(c.yearlyRupeeHigh).toBeLessThan(2.5e7);
  });

  it("HERO_IMPACT is derived from the anchors and lists its inputs", () => {
    expect(HERO_IMPACT.community.households).toBe(IMPACT_ANCHORS.demoHouseholds);
    expect(HERO_IMPACT.household.monthlyKwh).toBe(IMPACT_ANCHORS.avgMonthlyKwh);
    expect(HERO_IMPACT.inputs).toHaveLength(5);
    expect(HERO_IMPACT.inputs.map((i) => i.label)).toContain("Tariff");
  });

  it("formats ₹ in lakh / crore short scale", () => {
    expect(formatInrCompact(1.28e7)).toBe("₹1.3 Cr");
    expect(formatInrCompact(1_280_000)).toBe("₹12.8 L");
    expect(formatInrCompact(3120)).toBe("₹3,120");
    expect(formatInrCompact(-5)).toBe("₹0");
  });
});
