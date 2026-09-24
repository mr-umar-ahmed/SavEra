import { describe, expect, it } from "vitest";
import { H1024_APPLIANCES, H1024_BILL_HISTORY, H1024_HOUSEHOLD, H1024_ID, H1024_METER_START } from "@/data/fixtures/h1024";
import { billsFromHistory } from "@/data/fixtures/shared";
import { DEMO_TARIFF } from "@/data/catalogue/tariff";
import { estimateAppliances, sumEstimates } from "./appliances";
import { buildEnergyAnalysis } from "./energyProfile";
import { projectTwin } from "./twin";
import { explain } from "./explain";
import type { TwinDevice } from "@/types";

describe("Electricity Engine — H-1024 Calibration", () => {
  const now = "2026-09-25";
  const bills = billsFromHistory(H1024_ID, H1024_BILL_HISTORY, now, {
    meterStart: H1024_METER_START,
    tariffName: "Demo Domestic LT-1",
  });

  it("calibrates appliance estimates matching spec anchors", () => {
    const estimates = estimateAppliances(H1024_APPLIANCES, { season: "normal" });
    const byType = Object.fromEntries(estimates.map((e) => [e.type, e.kwh]));

    // Assert individual appliances: AC ≈ 155, fans ≈ 70, fridge ≈ 46, lighting ≈ 29, TV ≈ 20
    expect(byType.ac).toBeGreaterThanOrEqual(140);
    expect(byType.ac).toBeLessThanOrEqual(170);

    expect(byType.ceiling_fan).toBeGreaterThanOrEqual(60);
    expect(byType.ceiling_fan).toBeLessThanOrEqual(80);

    expect(byType.fridge).toBeGreaterThanOrEqual(40);
    expect(byType.fridge).toBeLessThanOrEqual(52);

    const lightingKwh = (byType.led_bulb ?? 0) + (byType.tube_light ?? 0);
    expect(lightingKwh).toBeGreaterThanOrEqual(25);
    expect(lightingKwh).toBeLessThanOrEqual(35);

    expect(byType.tv).toBeGreaterThanOrEqual(16);
    expect(byType.tv).toBeLessThanOrEqual(25);

    // Sum of estimates ≈ 365 (355 - 375)
    const total = sumEstimates(estimates);
    expect(total).toBeGreaterThanOrEqual(355);
    expect(total).toBeLessThanOrEqual(375);

    // Unallocated against 390 is ≈ 20-25 kWh
    const unallocated = 390 - total;
    expect(unallocated).toBeGreaterThanOrEqual(15);
    expect(unallocated).toBeLessThanOrEqual(35);
  });

  it("builds energy analysis for H-1024 with 350 -> 390 MoM, forecast 405-430, Medium confidence", () => {
    const analysis = buildEnergyAnalysis({
      household: H1024_HOUSEHOLD,
      appliances: H1024_APPLIANCES,
      bills,
      areaAvgKwh: 340,
      now,
    });

    expect(analysis.current.actualKwh).toBe(390);
    expect(analysis.previous?.actualKwh).toBe(350);

    // MoM: +40 kWh (+11.4 %)
    expect(analysis.mom?.delta).toBe(40);
    expect(analysis.mom?.deltaPct).toBeCloseTo(11.4, 1);

    // Baseline for Sep ≈ 320–350
    expect(analysis.baseline.mid).toBeGreaterThanOrEqual(320);
    expect(analysis.baseline.mid).toBeLessThanOrEqual(355);

    // Forecast: 405–430 kWh, Bill ₹3,250–3,500
    expect(analysis.forecast.point).toBeGreaterThanOrEqual(405);
    expect(analysis.forecast.point).toBeLessThanOrEqual(435);
    expect(analysis.forecast.billPoint).toBeGreaterThanOrEqual(3200);
    expect(analysis.forecast.billPoint).toBeLessThanOrEqual(3550);

    // Confidence & completeness
    expect(analysis.confidence).toBe("Medium");
    expect(analysis.completeness.percent).toBeGreaterThanOrEqual(70);
    expect(analysis.completeness.percent).toBeLessThanOrEqual(85);
  });

  it("projects twin kWh and cost correctly", () => {
    const devices: TwinDevice[] = [
      {
        id: "ac",
        label: "Air Conditioner",
        on: true,
        kw: 1.5,
        ratedKw: 1.5,
        hoursPerDay: 4,
        flexible: true,
        icon: "air-vent",
      },
      {
        id: "fan",
        label: "Ceiling Fans",
        on: true,
        kw: 0.15,
        ratedKw: 0.15,
        hoursPerDay: 12,
        flexible: false,
        icon: "fan",
      },
    ];
    const projected = projectTwin(devices, DEMO_TARIFF);
    expect(projected.kwhPerMonth).toBeGreaterThan(0);
    expect(projected.rupees).toBeGreaterThan(0);
    expect(projected.kwNow).toBe(1.65);
  });

  it("enforces cautious AI explanation wording without assertive blame", () => {
    const text = explain("anomaly", {
      status: "above",
      contributors: ["Air Conditioner", "Ceiling Fan"],
    });
    expect(text.toLowerCase()).toContain("possible");
    expect(text).not.toContain("faulty");
    expect(text).not.toContain("broken");
  });
});
