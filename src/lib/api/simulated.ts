import type {
  ConsentSource,
  ImportedFields,
  LpgBooking,
  OcrExtraction,
  ServiceTransaction,
} from "@/types";
import { newId, newRef } from "@/lib/ids";

export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulateOcr(_file: unknown): Promise<OcrExtraction> {
  await delay(600);
  return {
    kwh: 390,
    amount: 3120,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    billDate: "2026-09-30",
    meterPrev: 24700,
    meterCurr: 25090,
    consumerCategory: "domestic",
    tariffName: "Demo Domestic LT-1",
    confidence: "High",
    simulated: true,
  };
}

export async function simulateImport(source: ConsentSource): Promise<ImportedFields> {
  await delay(500);
  switch (source) {
    case "electricity_board":
      return {
        household: { consumerCategory: "domestic" },
        bills: [
          {
            id: newId("bill"),
            householdId: "H-1024",
            periodStart: "2026-08-01",
            periodEnd: "2026-08-31",
            billDate: "2026-08-31",
            month: "2026-08",
            kwh: 350,
            amount: 2850,
            source: "import",
          },
        ],
      };
    case "water_board":
      return {
        water: {
          usagePoints: ["kitchen", "bathroom", "washing"],
          scheduleAreaId: "area-xyz",
          source: "municipal",
          storageLitres: 1000,
        },
      };
    case "lpg_provider":
      return {
        cylinders: [
          {
            id: newId("cyl"),
            householdId: "H-1024",
            sizeKg: 14.2,
            refillDate: "2026-09-06",
            startDate: "2026-09-07",
            provider: "LPG Distribution Cell",
            source: "import",
          },
        ],
      };
    default:
      return {};
  }
}

export async function simulatePayment(
  householdId: string,
  amount: number,
  description = "Utility Bill Payment",
): Promise<ServiceTransaction> {
  await delay(450);
  const now = new Date().toISOString();
  return {
    ref: newRef("PAY"),
    kind: "payment",
    householdId,
    amount,
    description,
    status: "success",
    createdAt: now,
    simulated: true,
    receipt: {
      id: newId("rcpt"),
      method: "Simulated UPI / Net Banking",
      at: now,
    },
  };
}

export async function simulateBooking(
  householdId: string,
  _cylinderSizeKg = 14.2,
): Promise<LpgBooking> {
  await delay(450);
  const now = new Date().toISOString();
  return {
    id: newId("bk"),
    householdId,
    ref: newRef("LPG"),
    status: "requested",
    createdAt: now,
    updatedAt: now,
    history: [{ status: "requested", at: now }],
    simulated: true,
  };
}
