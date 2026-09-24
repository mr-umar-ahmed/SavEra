import type { Appliance, ElectricityBill, Household } from "@/types";
import { H1024_APPLIANCES, H1024_BILL_HISTORY, H1024_HOUSEHOLD, H1024_ID, H1024_METER_START } from "../fixtures/h1024";
import { H1088_APPLIANCES, H1088_BILL_HISTORY, H1088_HOUSEHOLD, H1088_ID, H1088_METER_START } from "../fixtures/h1088";
import { billsFromHistory } from "../fixtures/shared";
import { AREAS } from "../geo/raichur";
import { createPrng } from "./prng";

export function seedHouseholdsAndAppliances(now: string): {
  households: Household[];
  appliances: Appliance[];
  bills: ElectricityBill[];
} {
  const households: Household[] = [H1024_HOUSEHOLD, H1088_HOUSEHOLD];
  const appliances: Appliance[] = [...H1024_APPLIANCES, ...H1088_APPLIANCES];
  const bills: ElectricityBill[] = [
    ...billsFromHistory(H1024_ID, H1024_BILL_HISTORY, now, {
      meterStart: H1024_METER_START,
      tariffName: "Demo Domestic LT-1",
    }),
    ...billsFromHistory(H1088_ID, H1088_BILL_HISTORY, now, {
      meterStart: H1088_METER_START,
      tariffName: "Demo Domestic LT-1",
    }),
  ];

  // Seed additional realistic households across Ward 24 and other wards
  const rng = createPrng(1024);
  const ward24Areas = AREAS.filter((a) => a.wardId === "ward-24");

  for (let i = 1; i <= 60; i++) {
    const num = 1000 + i;
    if (num === 1024 || num === 1088) continue;
    const hhId = `H-${num}`;
    const area = ward24Areas[i % ward24Areas.length];

    const people = 2 + Math.floor(rng() * 4); // 2 to 5 people
    const homeTypes = ["1BHK", "2BHK", "3BHK", "independent"] as const;
    const homeType = homeTypes[Math.floor(rng() * homeTypes.length)];
    const sizeSqft = homeType === "1BHK" ? 600 : homeType === "2BHK" ? 950 : homeType === "3BHK" ? 1350 : 1800;

    const hh: Household = {
      id: hhId,
      areaId: area.id,
      wardId: area.wardId,
      zoneId: area.zoneId,
      name: `Resident ${num}`,
      pin: "584101",
      providerId: "Electricity Department",
      consumerCategory: "domestic",
      people,
      homeType,
      sizeSqft,
      renewable: rng() > 0.85 ? "rooftop_solar" : "none",
      sections: {
        household: "complete",
        electricity: "complete",
        water: "complete",
        gas: "complete",
        carbon: "none",
      },
      water: {
        usagePoints: ["kitchen", "bathroom", "washing"],
        scheduleAreaId: area.id,
        source: "municipal",
        storageLitres: 1000,
      },
      gas: {
        kind: "lpg",
        cylinderSizeKg: 14.2,
        provider: "LPG Distribution Cell",
      },
      createdAt: `${now}T00:00:00.000Z`,
      displayNamePublic: false,
    };
    households.push(hh);

    // Basic appliances for peer estimation
    appliances.push(
      {
        id: `app-${num}-fan`,
        householdId: hhId,
        type: "ceiling_fan",
        category: "fans_ventilation",
        label: "Ceiling fans",
        spec: { watts: 75, fanType: "ceiling" },
        count: Math.max(2, people),
        hoursPerDay: 8,
        daysPerMonth: 30,
        setupStatus: "complete",
        source: "manual",
      },
      {
        id: `app-${num}-fridge`,
        householdId: hhId,
        type: "fridge",
        category: "kitchen",
        label: "Refrigerator",
        spec: { fridgeType: "double_door", capacityLitres: 240, star: 3 },
        count: 1,
        hoursPerDay: 24,
        daysPerMonth: 30,
        setupStatus: "complete",
        source: "manual",
      },
      {
        id: `app-${num}-light`,
        householdId: hhId,
        type: "led_bulb",
        category: "lighting",
        label: "LED lights",
        spec: { watts: 10, bulbCount: 6 },
        count: 6,
        hoursPerDay: 5,
        daysPerMonth: 30,
        setupStatus: "complete",
        source: "manual",
      },
    );

    // Generate 12 months bills for peer ranking
    const baseKwh = 180 + Math.floor(rng() * 220);
    const history = Array.from({ length: 12 }, (_, monthIdx) => {
      const offset = -monthIdx;
      const seasonalMultiplier = [1.0, 1.05, 1.15, 1.25, 1.2, 1.0, 0.95, 0.9, 0.9, 0.95, 1.0, 1.0][monthIdx % 12];
      const kwh = Math.round(baseKwh * seasonalMultiplier * (0.9 + rng() * 0.2));
      return {
        offset,
        kwh,
        amount: Math.round(kwh * 7.5 + 100),
      };
    });

    bills.push(
      ...billsFromHistory(hhId, history, now, {
        meterStart: 5000 + i * 300,
        tariffName: "Demo Domestic LT-1",
      }),
    );
  }

  return { households, appliances, bills };
}
