import type { Notification } from "@/types";
import { addDaysIso } from "../fixtures/shared";
import { H1024_ID } from "../fixtures/h1024";

export function seedNotifications(now: string): Notification[] {
  return [
    {
      id: "ntf-01",
      target: {
        role: "citizen",
        householdIds: [H1024_ID],
      },
      type: "dr_event",
      stream: "electricity",
      title: "Automated Demand Response Event Active",
      body: "Evening peak reduction active from 18:30 to 21:30. AC temperature will adjust +2 °C automatically.",
      href: "/citizen/connected/twin",
      createdAt: `${now}T18:30:00.000Z`,
      readBy: [],
      official: true,
    },
    {
      id: "ntf-02",
      target: {
        role: "citizen",
        householdIds: [H1024_ID],
        wardIds: ["ward-24"],
      },
      type: "water_case",
      stream: "water",
      title: "XYZ Colony Water Case Under Review",
      body: "Your report has been grouped with 77 other households in XYZ Colony. Supervisor is reviewing the area supply.",
      href: "/citizen/water",
      createdAt: `${now}T07:45:00.000Z`,
      readBy: [],
    },
    {
      id: "ntf-03",
      target: {
        role: "citizen",
        householdIds: [H1024_ID],
      },
      type: "green_score",
      title: "Green Score Updated: #84 in Ward 24",
      body: "Congratulations! Your Green Score is 86 (+43 rank improvement this month).",
      href: "/citizen/green-score",
      createdAt: `${now}T08:00:00.000Z`,
      readBy: [],
    },
    {
      id: "ntf-04",
      target: {
        role: "supervisor",
        wardIds: ["ward-24"],
      },
      type: "water_case",
      stream: "water",
      title: "High-Priority Water Case Detected (XYZ Colony)",
      body: "78 households reported low pressure or no water during morning supply window (07:00–08:00). Action required.",
      href: "/supervisor/water/cases",
      createdAt: `${now}T07:15:00.000Z`,
      readBy: [],
    },
    {
      id: "ntf-05",
      target: {
        role: "supervisor",
        wardIds: ["ward-24"],
      },
      type: "lpg",
      stream: "lpg",
      title: "LPG Aggregate Alert: ABC Colony +19.5%",
      body: "Area B (ABC Colony) consumption is 4,900 kg vs 4,100 kg baseline (>15% increase). Review refill demand pattern.",
      href: "/supervisor/lpg",
      createdAt: `${now}T09:30:00.000Z`,
      readBy: [],
    },
    {
      id: "ntf-06",
      target: {
        role: "gov",
        departments: ["electricity"],
      },
      type: "electricity",
      stream: "electricity",
      title: "City Peak Demand Threshold Approaching",
      body: "Total grid load reached 142.4 MW. DR Event #dr-001 has averted 1.25 MW across Ward 24.",
      href: "/gov/electricity",
      createdAt: `${now}T19:00:00.000Z`,
      readBy: [],
    },
    {
      id: "ntf-07",
      target: {
        role: "gov",
        departments: ["water"],
      },
      type: "water_action",
      stream: "water",
      title: "Ward 18 Action Scheduled Confirmation",
      body: "Booster run scheduled for 10:00 AM on Ward 18 pipeline following resolved case.",
      href: "/gov/water",
      createdAt: `${addDaysIso(now, -1)}T16:00:00.000Z`,
      readBy: ["u-gov-water"],
      official: true,
    },
  ];
}
