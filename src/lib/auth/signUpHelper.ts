import type {
  Appliance,
  ElectricityBill,
  Household,
  HomeType,
  Role,
  Department,
  User,
  DemoAccount,
} from "@/types";
import { computeBill } from "@/lib/engine/tariff";
import { billsFromHistory, type BillHistoryPoint } from "@/data/fixtures/shared";
import { newId } from "@/lib/ids";

export interface SignUpInput {
  name: string;
  email: string;
  mobile: string;
  password?: string;
  role: Role;
  department?: Department;
  areaId?: string;
  wardId?: string;
  homeType?: HomeType;
  people?: number;
  sizeSqft?: number;
  consumerNumber?: string;
}

/**
 * Creates dynamic household, appliances, and 12-month dynamic billing history
 * based on user inputs.
 */
export function createDynamicUserData(input: SignUpInput, now = "2026-09-25"): {
  user: User;
  account: DemoAccount;
  household?: Household;
  appliances: Appliance[];
  bills: ElectricityBill[];
} {
  const userId = `u-${input.role}-${Date.now().toString(36)}`;
  const password = input.password?.trim() || "savera";
  const people = input.people ?? 3;
  const homeType = input.homeType ?? "2BHK";
  const sizeSqft =
    input.sizeSqft ??
    (homeType === "1BHK"
      ? 600
      : homeType === "2BHK"
      ? 950
      : homeType === "3BHK"
      ? 1400
      : 1800);

  if (input.role !== "citizen") {
    const user: User = {
      id: userId,
      role: input.role,
      department: input.department,
      wardId: input.wardId ?? "ward-24",
      name: input.name,
      email: input.email.trim().toLowerCase(),
      mobile: input.mobile.trim(),
      displayNamePublic: true,
    };
    const account: DemoAccount = {
      userId,
      role: input.role,
      email: input.email.trim().toLowerCase(),
      mobile: input.mobile.trim(),
      password,
      otp: "123456",
      label: `${input.name} (${input.role.toUpperCase()})`,
      description: input.department
        ? `${input.department} Authority`
        : `Ward ${input.wardId ?? "24"} Supervisor Desk`,
    };
    return { user, account, appliances: [], bills: [] };
  }

  // Citizen Household Generation
  const randomSuffix = Math.floor(1100 + Math.random() * 8900);
  const householdId = `H-${randomSuffix}`;
  const areaId = input.areaId ?? "area-xyz";
  const wardId = input.wardId ?? "ward-24";
  const consumerNumber =
    input.consumerNumber?.trim() ||
    `RR-584101-${Math.floor(10000 + Math.random() * 90000)}`;

  const household: Household = {
    id: householdId,
    areaId,
    wardId,
    zoneId: "zone-3",
    name: input.name,
    mobile: input.mobile.trim(),
    pin: "584101",
    providerId: "Electricity Department (GESCOM)",
    consumerCategory: "domestic",
    people,
    homeType,
    sizeSqft,
    renewable: "none",
    sections: {
      household: "complete",
      electricity: "complete",
      water: "complete",
      gas: "complete",
      carbon: "none",
    },
    water: {
      usagePoints: ["kitchen", "bathroom", "washing"],
      scheduleAreaId: areaId,
      source: "municipal",
      storageLitres: 1000,
    },
    gas: {
      kind: "lpg",
      cylinderSizeKg: 14.2,
      provider: "LPG Distribution Cell",
    },
    createdAt: `${now}T00:00:00.000Z`,
    displayName: input.name,
    displayNamePublic: false,
  };

  const user: User = {
    id: userId,
    role: "citizen",
    householdId,
    wardId,
    name: input.name,
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile.trim(),
    displayNamePublic: false,
  };

  const account: DemoAccount = {
    userId,
    role: "citizen",
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile.trim(),
    password,
    otp: "123456",
    label: `${input.name} (${householdId})`,
    description: `${householdId}, ${areaId.toUpperCase()}, Ward ${wardId}`,
  };

  // Generate dynamic appliances based on household attributes
  const appliances: Appliance[] = [
    {
      id: newId("app"),
      householdId,
      type: "ceiling_fan",
      category: "fans_ventilation",
      label: "Ceiling Fans",
      spec: { fanType: "ceiling", watts: 75 },
      count: Math.max(2, people + 1),
      hoursPerDay: 8,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    },
    {
      id: newId("app"),
      householdId,
      type: "led_bulb",
      category: "lighting",
      label: "LED Bulbs",
      spec: { watts: 10, bulbCount: Math.max(6, people * 3) },
      count: Math.max(6, people * 3),
      hoursPerDay: 5,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    },
    {
      id: newId("app"),
      householdId,
      type: "fridge",
      category: "kitchen",
      label: "Refrigerator (Frost Free)",
      spec: {
        fridgeType: "double_door",
        capacityLitres: people > 3 ? 260 : 210,
        star: 3,
        inverter: true,
      },
      count: 1,
      hoursPerDay: 24,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    },
    {
      id: newId("app"),
      householdId,
      type: "tv",
      category: "entertainment",
      label: '43" Smart LED TV',
      spec: { screenInches: 43, ratedWatts: 85 },
      count: 1,
      hoursPerDay: 5,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    },
    {
      id: newId("app"),
      householdId,
      type: "geyser",
      category: "water_heating",
      label: "Storage Geyser (15L)",
      spec: { geyserLitres: 15, ratedWatts: 2000, star: 4 },
      count: 1,
      hoursPerDay: 1,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    },
  ];

  if (homeType === "2BHK" || homeType === "3BHK" || homeType === "independent") {
    appliances.push({
      id: newId("app"),
      householdId,
      type: "ac",
      category: "cooling",
      label: "Split AC 1.5 Ton 5-Star",
      spec: {
        acType: "split",
        tonnage: 1.5,
        star: 5,
        inverter: true,
        ratedWatts: 1450,
      },
      count: homeType === "3BHK" ? 2 : 1,
      hoursPerDay: 6,
      daysPerMonth: 30,
      setupStatus: "complete",
      source: "manual",
    });
  }

  // Base monthly kWh consumption dynamically scaled to people and homeType
  const baseKwh = Math.round(
    110 + people * 45 + (homeType === "3BHK" ? 110 : homeType === "2BHK" ? 60 : 20)
  );

  // Month-by-month multipliers for 12 months (April-May summer peak, Aug-Sep monsoon, Dec-Jan winter)
  // offset: 0 is current month (Sep), -1 is Aug ... -11 is Oct of previous year
  const seasonalMultipliers = [
    1.08, // 0: Sep
    1.02, // -1: Aug
    0.98, // -2: Jul
    1.15, // -3: Jun
    1.32, // -4: May (peak heat)
    1.28, // -5: Apr (heat)
    1.05, // -6: Mar
    0.92, // -7: Feb
    0.85, // -8: Jan (winter)
    0.86, // -9: Dec (winter)
    0.95, // -10: Nov
    1.00, // -11: Oct
  ];

  const billHistory: BillHistoryPoint[] = seasonalMultipliers.map((mult, idx) => {
    const kwh = Math.round(baseKwh * mult);
    const billBreakdown = computeBill(kwh);
    return {
      offset: -idx,
      kwh,
      amount: billBreakdown.total,
    };
  });

  const bills = billsFromHistory(householdId, billHistory, now, {
    meterStart: Math.floor(1000 + Math.random() * 4000),
    tariffName: "Demo Domestic LT-1",
  });

  return { user, account, household, appliances, bills };
}
