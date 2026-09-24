import type { Role } from "@/types";

export interface VoiceIntentResult {
  matched: boolean;
  transcript: string;
  response: string;
  route?: string;
  twinAction?: {
    device: "ac";
    state?: "on" | "off";
    temp?: number;
  };
}

export function matchVoiceIntent(query: string, role: Role): VoiceIntentResult {
  const q = query.toLowerCase().trim();

  // Citizen Intents
  if (role === "citizen") {
    if (q.includes("appliance") && (q.includes("most") || q.includes("highest") || q.includes("consuming"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Your Air Conditioner (1.5 Ton, 3 Star) is your largest estimated consumer at approximately 155 kWh this month (~42% of total estimated load).",
        route: "/citizen/electricity",
      };
    }

    if (q.includes("electricity") && (q.includes("how much") || q.includes("usage") || q.includes("bill") || q.includes("month"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Your current month recorded usage is 390 kWh, which is approximately 11.4% higher than your personal baseline of 350 kWh. Estimated bill is ₹3,120.",
        route: "/citizen/electricity",
      };
    }

    if (q.includes("water") && (q.includes("reduce") || q.includes("save") || q.includes("conservation"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Recommended water action: Install low-flow aerators on kitchen and bathroom taps to reduce flow by up to 35% without pressure loss.",
        route: "/citizen/water",
      };
    }

    if (q.includes("water") && (q.includes("today") || q.includes("supply") || q.includes("schedule"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Today's scheduled water supply for XYZ Colony is 7:00 AM – 8:00 AM. 78 local households reported reduced pressure today.",
        route: "/citizen/water",
      };
    }

    if (q.includes("lpg") || q.includes("cylinder") || q.includes("gas")) {
      if (q.includes("finish") || q.includes("refill") || q.includes("when") || q.includes("days")) {
        return {
          matched: true,
          transcript: query,
          response:
            "Based on your 0.57 kg/day consumption rate over the past 18 days, your current 14.2 kg cylinder is predicted to finish in approximately 7 days.",
          route: "/citizen/gas",
        };
      }
    }

    if (q.includes("green score") || q.includes("score") || q.includes("rank")) {
      return {
        matched: true,
        transcript: query,
        response:
          "Your current Green Score is 86 out of 100, placing you at rank #84 among 700 peer households in Ward 24, up 43 positions from last month.",
        route: "/citizen/green-score",
      };
    }

    if (q.includes("ac") && (q.includes("turn off") || q.includes("switch off") || q.includes("power off"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Simulated AC powered off in your Digital Twin prototype. Projected monthly savings: ~45 kWh.",
        route: "/citizen/twin",
        twinAction: { device: "ac", state: "off" },
      };
    }

    if (q.includes("ac") && (q.includes("26") || q.includes("degrees") || q.includes("temperature"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Simulated AC thermostat set to 26°C in your Digital Twin prototype. Each 1°C increase may reduce cooling power demand by approximately 6%.",
        route: "/citizen/twin",
        twinAction: { device: "ac", state: "on", temp: 26 },
      };
    }
  }

  // Supervisor Intents
  if (role === "supervisor") {
    if (q.includes("high-consumption") || q.includes("high consumption") || (q.includes("areas") && q.includes("ward 24"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "In Ward 24, Area B (XYZ Colony) exhibits higher than baseline consumption across water and LPG demand.",
        route: "/supervisor/water/areas/area-xyz",
      };
    }

    if (q.includes("pending") || q.includes("field verification") || q.includes("verifications")) {
      return {
        matched: true,
        transcript: query,
        response:
          "There are currently 3 pending field verifications in Ward 24, including case XYZ-001 with 78 household reports under review.",
        route: "/supervisor/water/cases/case-xyz-001",
      };
    }

    if (q.includes("complaints") || q.includes("water complaints") || q.includes("summarise") || q.includes("summarize")) {
      return {
        matched: true,
        transcript: query,
        response:
          "Ward 24 received 124 water feedback reports today: 78 from XYZ Colony, 34 from ABC Colony, and 12 from DEF Colony.",
        route: "/supervisor/water",
      };
    }

    if (q.includes("xyz colony") || q.includes("open") || q.includes("case")) {
      return {
        matched: true,
        transcript: query,
        response: "Opening case XYZ-001: Water Supply Pressure Drop in XYZ Colony.",
        route: "/supervisor/water/cases/case-xyz-001",
      };
    }
  }

  // Government Intents
  if (role === "gov") {
    if (q.includes("wards") && (q.includes("water") || q.includes("baseline") || q.includes("above"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Ward 24 (+18.4%) and Ward 18 (+12.1%) currently exceed their historical seasonal baselines for municipal water demand.",
        route: "/gov/wards",
      };
    }

    if (q.includes("lpg") && (q.includes("requirement") || q.includes("forecast") || q.includes("next month"))) {
      return {
        matched: true,
        transcript: query,
        response:
          "Next month's predicted LPG requirement for Raichur is 60,000 kg (~4,437 standard 14.2 kg cylinders).",
        route: "/gov/gas",
      };
    }

    if (q.includes("heatmap") || q.includes("map")) {
      return {
        matched: true,
        transcript: query,
        response: "Opening the City Resource Heatmap with multi-utility GIS layers.",
        route: "/gov/heatmap",
      };
    }

    if (q.includes("alert") || q.includes("interruption") || q.includes("publish")) {
      return {
        matched: true,
        transcript: query,
        response:
          "Opening official disruption alert publisher prefilled for Ward 24 Power Interruption.",
        route: "/gov/alerts?type=power&ward=ward-24",
      };
    }
  }

  // Fallback
  return {
    matched: false,
    transcript: query,
    response:
      "I can help you with utility intelligence. Try asking about electricity consumption, water schedules, LPG refill dates, or your Green Score.",
  };
}
