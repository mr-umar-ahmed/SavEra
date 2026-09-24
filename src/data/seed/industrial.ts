import type { GhgActivity, IndustrialUnit } from "@/types";
import { EMISSION_THRESHOLDS_DEFAULT } from "../catalogue/thresholds";
import { currentMonth } from "@/lib/dates";
import { INDUSTRIAL_SITES } from "../geo/raichur";

export function seedIndustrial(now: string): {
  industrialUnits: IndustrialUnit[];
  ghgActivity: GhgActivity[];
} {
  const month = currentMonth(now);

  const industrialUnits: IndustrialUnit[] = INDUSTRIAL_SITES.map((site, index) => {
    // ind-01 and ind-03 (Thermal power) have higher emissions
    const isThermal = site.sector === "Thermal power";
    const isCement = site.sector === "Cement";

    let pm = 65;
    let so2 = 45;
    let nox = 55;
    let status: "within" | "elevated" | "exceedance" = "within";
    let trend: "up" | "down" | "flat" = "flat";

    if (isThermal) {
      pm = 112; // elevated (> 100)
      so2 = 88; // elevated (> 80)
      nox = 78;
      status = "elevated";
      trend = "up";
    } else if (isCement) {
      pm = 158; // exceedance (> 150)
      so2 = 62;
      nox = 85; // elevated (> 80)
      status = "exceedance";
      trend = "up";
    } else if (index === 4) {
      pm = 75;
      so2 = 50;
      nox = 40;
      trend = "down";
    }

    return {
      id: site.id,
      name: site.name,
      sector: site.sector,
      location: site.location,
      stackHeightM: site.stackHeightM,
      readings: { pm, so2, nox },
      thresholds: EMISSION_THRESHOLDS_DEFAULT,
      status,
      lastUpdate: `${now}T11:30:00.000Z`,
      trend,
      simulatedFeed: true,
    };
  });

  const ghgActivity: GhgActivity[] = INDUSTRIAL_SITES.map((site) => {
    const isPower = site.sector === "Thermal power";
    const isHeavy = site.sector === "Cement" || site.sector === "Steel";

    return {
      unitId: site.id,
      month,
      dieselLitres: isPower ? 45000 : isHeavy ? 28000 : 8500,
      electricityKwh: isPower ? 1200000 : isHeavy ? 650000 : 180000,
      naturalGasScm: isPower ? 35000 : isHeavy ? 15000 : 3000,
      processTonnes: isPower ? 180 : isHeavy ? 120 : 25,
    };
  });

  return { industrialUnits, ghgActivity };
}
