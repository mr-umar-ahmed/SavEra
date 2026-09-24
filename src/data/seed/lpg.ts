import type { LpgBooking, LpgCylinder } from "@/types";
import { H1024_ID, H1024_LPG } from "../fixtures/h1024";
import { H1088_ID, H1088_LPG } from "../fixtures/h1088";
import { addDaysIso, lpgCylindersFromSpec } from "../fixtures/shared";
import { createPrng } from "./prng";

export function seedLpg(now: string): {
  cylinders: LpgCylinder[];
  lpgBookings: LpgBooking[];
} {
  const cylinders: LpgCylinder[] = [
    ...lpgCylindersFromSpec(H1024_ID, H1024_LPG, now),
    ...lpgCylindersFromSpec(H1088_ID, H1088_LPG, now),
  ];

  const rng = createPrng(4096);

  // Additional cylinders for other households for realistic aggregation
  for (let i = 1; i <= 40; i++) {
    const hhId = `H-${1000 + i}`;
    if (hhId === H1024_ID || hhId === H1088_ID) continue;

    const cycleDays1 = 24 + Math.floor(rng() * 6);
    const cycleDays2 = 23 + Math.floor(rng() * 7);
    const elapsed = 4 + Math.floor(rng() * 18);

    const specs = [
      {
        id: `cyl-${hhId.toLowerCase()}-1`,
        daysAgoStart: cycleDays1 + cycleDays2 + elapsed,
        days: cycleDays1,
        sizeKg: 14.2,
        provider: "LPG Distribution Cell",
      },
      {
        id: `cyl-${hhId.toLowerCase()}-2`,
        daysAgoStart: cycleDays2 + elapsed,
        days: cycleDays2,
        sizeKg: 14.2,
        provider: "LPG Distribution Cell",
      },
      {
        id: `cyl-${hhId.toLowerCase()}-3`,
        daysAgoStart: elapsed,
        current: true,
        sizeKg: 14.2,
        provider: "LPG Distribution Cell",
      },
    ];

    cylinders.push(...lpgCylindersFromSpec(hhId, specs, now));
  }

  const lpgBookings: LpgBooking[] = [
    {
      id: "bk-1024-1",
      householdId: H1024_ID,
      ref: "LPG-REF-89104",
      status: "delivered",
      createdAt: addDaysIso(now, -19) + "T10:30:00.000Z",
      updatedAt: addDaysIso(now, -18) + "T15:45:00.000Z",
      history: [
        { status: "requested", at: addDaysIso(now, -19) + "T10:30:00.000Z" },
        { status: "confirmed", at: addDaysIso(now, -19) + "T11:00:00.000Z" },
        { status: "out_for_delivery", at: addDaysIso(now, -18) + "T09:00:00.000Z" },
        { status: "delivered", at: addDaysIso(now, -18) + "T15:45:00.000Z" },
      ],
      simulated: true,
    },
    {
      id: "bk-1088-1",
      householdId: H1088_ID,
      ref: "LPG-REF-87321",
      status: "delivered",
      createdAt: addDaysIso(now, -7) + "T09:15:00.000Z",
      updatedAt: addDaysIso(now, -6) + "T14:20:00.000Z",
      history: [
        { status: "requested", at: addDaysIso(now, -7) + "T09:15:00.000Z" },
        { status: "confirmed", at: addDaysIso(now, -7) + "T10:00:00.000Z" },
        { status: "out_for_delivery", at: addDaysIso(now, -6) + "T08:30:00.000Z" },
        { status: "delivered", at: addDaysIso(now, -6) + "T14:20:00.000Z" },
      ],
      simulated: true,
    },
  ];

  return { cylinders, lpgBookings };
}
