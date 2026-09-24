import { describe, expect, it } from "vitest";
import {
  assessSeverity,
  caseTimeline,
  groupReportsIntoCases,
  transitionCase,
  AI_ASSESSMENT,
} from "./water";
import type { Area, WaterBreakdown, WaterCase, WaterReport, WaterSupplySchedule } from "@/types";

describe("Water Engine", () => {
  const dummyArea: Area = {
    id: "area-xyz",
    name: "XYZ Colony",
    code: "A",
    wardId: "ward-24",
    zoneId: "zone-3",
    householdCount: 500,
    participatingHouseholds: 250,
    centroid: [16.205, 77.355],
    polygon: [
      [16.2, 77.35],
      [16.21, 77.35],
      [16.21, 77.36],
      [16.2, 77.36],
    ],
    streets: ["Main Road", "1st Cross"],
  };

  const dummySchedule: WaterSupplySchedule = {
    areaId: "area-xyz",
    start: "06:00",
    end: "08:30",
    frequency: "daily",
    plannedLitres: 120000,
  };

  it("assesses severity according to share of insufficient or no water", () => {
    const highBreakdown: WaterBreakdown = {
      sufficient: 20,
      insufficient: 70,
      lowPressure: 0,
      shortDuration: 0,
      noWater: 10,
    };
    expect(assessSeverity(highBreakdown, 100)).toBe("high");

    const moderateBreakdown: WaterBreakdown = {
      sufficient: 85,
      insufficient: 15,
      lowPressure: 0,
      shortDuration: 0,
      noWater: 0,
    };
    expect(assessSeverity(moderateBreakdown, 100)).toBe("moderate");

    const normalBreakdown: WaterBreakdown = {
      sufficient: 96,
      insufficient: 4,
      lowPressure: 0,
      shortDuration: 0,
      noWater: 0,
    };
    expect(assessSeverity(normalBreakdown, 100)).toBe("normal");
  });

  it("groups sufficient reports into a new case when threshold is met", () => {
    const reports: WaterReport[] = Array.from({ length: 15 }, (_, i) => ({
      id: `wr-${i}`,
      householdId: `H-10${i}`,
      areaId: "area-xyz",
      wardId: "ward-24",
      date: "2026-09-25",
      submittedAt: "2026-09-25T07:30:00.000Z",
      experience: "no_water",
      status: "submitted",
    }));

    const cases = groupReportsIntoCases({
      reports,
      area: dummyArea,
      schedule: dummySchedule,
      existing: [],
      now: "2026-09-25",
    });

    expect(cases.length).toBe(1);
    expect(cases[0].reportCount).toBe(15);
    expect(cases[0].areaId).toBe("area-xyz");
    expect(cases[0].aiAssessment).toBe(AI_ASSESSMENT);
  });

  it("handles valid transitions and rejects invalid ones", () => {
    const initialCase: WaterCase = {
      id: "case-xyz-test",
      areaId: "area-xyz",
      wardId: "ward-24",
      stream: "water",
      state: "detected",
      severity: "high",
      reportCount: 15,
      householdsAffected: 15,
      respondents: 15,
      plannedWindow: {
        start: "06:00",
        end: "08:30",
        plannedLitres: 120000,
      },
      availabilityVsExpected: "significantly_below",
      reportFrequency: "medium",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      detectedAt: "2026-09-25T07:00:00.000Z",
      updatedAt: "2026-09-25T07:45:00.000Z",
      breakdown: { sufficient: 0, insufficient: 5, lowPressure: 0, shortDuration: 0, noWater: 10 },
      history: [
        {
          state: "detected",
          at: "2026-09-25T07:00:00.000Z",
          note: "Initial case detection",
        },
      ],
    };

    // Transition to under_review
    const underReview = transitionCase(
      initialCase,
      { type: "review" },
      "2026-09-25T08:00:00.000Z",
      "supervisor-24",
    );
    expect(underReview.state).toBe("under_review");

    // Assign verification
    const assigned = transitionCase(
      underReview,
      { type: "assign", assistantId: "fa-ravi", checklist: ["Check pressure"] },
      "2026-09-25T08:15:00.000Z",
      "supervisor-24",
    );
    expect(assigned.state).toBe("verification_assigned");
    expect(assigned.assignment?.assistantId).toBe("fa-ravi");

    // Illegal jump from detected directly to resolved should throw
    expect(() =>
      transitionCase(initialCase, { type: "resolve" }, "2026-09-25T09:00:00.000Z", "gov-water"),
    ).toThrow();
  });

  it("generates a 5-step citizen timeline", () => {
    const sampleCase: WaterCase = {
      id: "case-xyz-test",
      areaId: "area-xyz",
      wardId: "ward-24",
      stream: "water",
      state: "verification_assigned",
      severity: "moderate",
      reportCount: 20,
      householdsAffected: 15,
      respondents: 20,
      plannedWindow: {
        start: "06:00",
        end: "08:30",
        plannedLitres: 120000,
      },
      availabilityVsExpected: "below",
      reportFrequency: "medium",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      detectedAt: "2026-09-25T07:00:00.000Z",
      updatedAt: "2026-09-25T07:45:00.000Z",
      breakdown: { sufficient: 5, insufficient: 10, lowPressure: 5, shortDuration: 0, noWater: 0 },
      history: [
        {
          state: "detected",
          at: "2026-09-25T07:00:00.000Z",
          note: "15 reports detected",
        },
        {
          state: "under_review",
          at: "2026-09-25T07:30:00.000Z",
          note: "Reviewed",
        },
        {
          state: "verification_assigned",
          at: "2026-09-25T08:00:00.000Z",
          note: "Assigned to Ravi",
        },
      ],
    };

    const steps = caseTimeline(sampleCase);
    expect(steps.length).toBe(5);
    expect(steps[0].state).toBe("done"); // Reported
    expect(steps[1].state).toBe("done"); // Grouped
    expect(steps[2].state).toBe("active"); // Verification assigned
    expect(steps[3].state).toBe("pending"); // Action planned
    expect(steps[4].state).toBe("pending"); // Resolved
  });
});
