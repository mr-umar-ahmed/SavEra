import type { BillDue, ConsentGrant, Reminder, ServiceTransaction } from "@/types";
import { formatMonth } from "@/lib/format";
import { currentMonth } from "@/lib/dates";
import { addDaysIso } from "../fixtures/shared";
import { H1024_ID } from "../fixtures/h1024";

export function seedConnected(now: string): {
  consents: ConsentGrant[];
  transactions: ServiceTransaction[];
  reminders: Reminder[];
  billsDue: BillDue[];
} {
  const currentMonthKey = currentMonth(now);

  const consents: ConsentGrant[] = [
    {
      source: "electricity_board",
      householdId: H1024_ID,
      fields: ["monthly_kwh", "meter_readings", "consumer_category"],
      grantedAt: `${addDaysIso(now, -45)}T10:00:00.000Z`,
      status: "active",
    },
    {
      source: "water_board",
      householdId: H1024_ID,
      fields: ["supply_schedule", "connection_size", "feeder_id"],
      grantedAt: `${addDaysIso(now, -40)}T11:30:00.000Z`,
      status: "active",
    },
    {
      source: "lpg_provider",
      householdId: H1024_ID,
      fields: ["booking_history", "cylinder_size", "distributor_id"],
      grantedAt: `${addDaysIso(now, -35)}T09:20:00.000Z`,
      status: "active",
    },
  ];

  const transactions: ServiceTransaction[] = [
    {
      ref: "txn-1024-01",
      kind: "payment",
      householdId: H1024_ID,
      amount: 2850,
      description: "Electricity Bill Payment (August 2026)",
      status: "success",
      createdAt: `${addDaysIso(now, -25)}T14:10:00.000Z`,
      simulated: true,
      receipt: {
        id: "RCPT-GESCOM-77812",
        method: "UPI (Simulated)",
        at: `${addDaysIso(now, -25)}T14:10:05.000Z`,
      },
    },
    {
      ref: "txn-1024-02",
      kind: "booking",
      householdId: H1024_ID,
      amount: 910,
      description: "14.2 kg LPG Cylinder Booking",
      status: "success",
      createdAt: `${addDaysIso(now, -19)}T10:30:00.000Z`,
      simulated: true,
      receipt: {
        id: "RCPT-LPG-99214",
        method: "UPI (Simulated)",
        at: `${addDaysIso(now, -19)}T10:30:03.000Z`,
      },
    },
  ];

  const reminders: Reminder[] = [
    {
      id: "rem-1024-1",
      householdId: H1024_ID,
      title: "Water Supply Window in 10 mins",
      body: "Morning supply window for XYZ Colony starts at 07:00 AM.",
      dueAt: `${now}T06:50:00.000Z`,
      kind: "custom",
      createdAt: `${addDaysIso(now, -1)}T20:00:00.000Z`,
    },
    {
      id: "rem-1024-2",
      householdId: H1024_ID,
      title: "Electricity Bill Due Soon",
      body: `Your bill of ₹3,120 for ${formatMonth(currentMonthKey)} is due on ${addDaysIso(now, 10)}.`,
      dueAt: `${addDaysIso(now, 5)}T10:00:00.000Z`,
      kind: "bill",
      createdAt: `${now}T08:00:00.000Z`,
    },
    {
      id: "rem-1024-3",
      householdId: H1024_ID,
      title: "LPG Refill Recommendation",
      body: "Based on your 0.57 kg/day usage, booking a refill in ~7 days will avoid interruption.",
      dueAt: `${addDaysIso(now, 7)}T09:00:00.000Z`,
      kind: "lpg_refill",
      createdAt: `${now}T08:00:00.000Z`,
    },
  ];

  const billsDue: BillDue[] = [
    {
      id: "due-1024-el",
      householdId: H1024_ID,
      stream: "electricity",
      amount: 3120,
      dueDate: addDaysIso(now, 10),
      period: formatMonth(currentMonthKey),
      status: "due",
    },
  ];

  return { consents, transactions, reminders, billsDue };
}
