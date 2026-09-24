import type { FieldAssistant, WaterCase, WaterReport, WaterSupplySchedule } from "@/types";
import { AI_ASSESSMENT } from "@/lib/engine/water";
import { addDaysIso } from "../fixtures/shared";
import { AREAS } from "../geo/raichur";

export function seedWater(now: string): {
  waterSchedules: WaterSupplySchedule[];
  waterReports: WaterReport[];
  waterCases: WaterCase[];
  fieldAssistants: FieldAssistant[];
} {
  const waterSchedules: WaterSupplySchedule[] = [
    {
      areaId: "area-xyz",
      start: "07:00",
      end: "08:00",
      plannedLitres: 450000,
      frequency: "daily",
      note: "Planned morning municipal supply for XYZ Colony.",
    },
    {
      areaId: "area-abc",
      start: "06:30",
      end: "07:30",
      plannedLitres: 340000,
      frequency: "daily",
      note: "Planned morning municipal supply for ABC Colony.",
    },
    {
      areaId: "area-def",
      start: "06:00",
      end: "07:00",
      plannedLitres: 280000,
      frequency: "daily",
      note: "Planned morning municipal supply for DEF Colony.",
    },
    {
      areaId: "area-ghi",
      start: "07:30",
      end: "08:45",
      plannedLitres: 510000,
      frequency: "daily",
      note: "Planned morning municipal supply for GHI Colony.",
    },
  ];

  // Additional schedules for remaining areas
  for (const area of AREAS) {
    if (["area-xyz", "area-abc", "area-def", "area-ghi"].includes(area.id)) continue;
    waterSchedules.push({
      areaId: area.id,
      start: "06:00",
      end: "07:30",
      plannedLitres: 300000,
      frequency: "daily",
    });
  }

  const fieldAssistants: FieldAssistant[] = [
    { id: "fa-ravi", name: "Ravi Kumar", kind: "individual", available: true, phone: "+91 98450 12345" },
    { id: "fa-arif", name: "Arif Khan", kind: "individual", available: true, phone: "+91 98450 23456" },
    { id: "fa-suresh", name: "Suresh M", kind: "individual", available: true, phone: "+91 98450 34567" },
    { id: "fa-team04", name: "Rapid Response Team 04", kind: "team", available: true, phone: "+91 98450 45678" },
  ];

  const at0715 = `${now}T07:15:00.000Z`;
  const at0730 = `${now}T07:30:00.000Z`;
  const at0745 = `${now}T07:45:00.000Z`;
  const at0750 = `${now}T07:50:00.000Z`;
  const at0800 = `${now}T08:00:00.000Z`;
  const at0815 = `${now}T08:15:00.000Z`;

  const waterCases: WaterCase[] = [
    {
      id: "case-xyz-001",
      areaId: "area-xyz",
      wardId: "ward-24",
      stream: "water",
      severity: "high",
      reportCount: 78,
      householdsAffected: 78,
      respondents: 78,
      breakdown: {
        sufficient: 4,
        insufficient: 42,
        lowPressure: 16,
        shortDuration: 6,
        noWater: 10,
      },
      plannedWindow: { start: "07:00", end: "08:00", plannedLitres: 450000 },
      availabilityVsExpected: "significantly_below",
      reportFrequency: "high",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "under_review",
      detectedAt: at0715,
      updatedAt: at0745,
      history: [
        { state: "detected", at: at0715, note: "AI grouped 78 reports during 07:00–08:00 window" },
        { state: "under_review", at: at0745, note: "Supervisor reviewing area supply telemetry" },
      ],
    },
    {
      id: "case-ghi-001",
      areaId: "area-ghi",
      wardId: "ward-24",
      stream: "water",
      severity: "moderate",
      reportCount: 56,
      householdsAffected: 48,
      respondents: 56,
      breakdown: {
        sufficient: 12,
        insufficient: 24,
        lowPressure: 14,
        shortDuration: 4,
        noWater: 2,
      },
      plannedWindow: { start: "07:30", end: "08:45", plannedLitres: 510000 },
      availabilityVsExpected: "below",
      reportFrequency: "high",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "verification_assigned",
      detectedAt: at0745,
      updatedAt: at0800,
      assignment: { assistantId: "fa-arif", at: at0800, by: "u-supervisor-24" },
      verification: {
        assistantId: "fa-arif",
        assignedAt: at0800,
        progress: 1,
        gpsActive: true,
        checklist: [
          { key: "chk-1", label: "Inspect inlet distribution valve at GHI junction", done: true },
          { key: "chk-2", label: "Check line pressure with portable bar gauge", done: false },
          { key: "chk-3", label: "Verify tail-end tap flow on 4th Cross", done: false },
        ],
        affectedStreets: ["4th Cross", "Main Bazaar Road"],
        evidence: [],
        timeline: [{ at: at0800, text: "Field verification assigned to Arif Khan" }],
      },
      history: [
        { state: "detected", at: at0745, note: "56 reports detected" },
        { state: "under_review", at: at0750, note: "Reviewed by supervisor" },
        { state: "verification_assigned", at: at0800, note: "Assigned to Arif Khan" },
      ],
    },
    {
      id: "case-abc-001",
      areaId: "area-abc",
      wardId: "ward-24",
      stream: "water",
      severity: "moderate",
      reportCount: 34,
      householdsAffected: 28,
      respondents: 34,
      breakdown: {
        sufficient: 8,
        insufficient: 16,
        lowPressure: 8,
        shortDuration: 2,
        noWater: 0,
      },
      plannedWindow: { start: "06:30", end: "07:30", plannedLitres: 340000 },
      availabilityVsExpected: "below",
      reportFrequency: "medium",
      historicalComparison: "normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "verification_in_progress",
      detectedAt: at0715,
      updatedAt: at0815,
      assignment: { assistantId: "fa-ravi", at: at0745, by: "u-supervisor-24" },
      verification: {
        assistantId: "fa-ravi",
        assignedAt: at0745,
        progress: 3,
        gpsActive: true,
        observedStart: "06:45",
        observedEnd: "07:15",
        durationMin: 30,
        pressure: "low",
        availability: "low",
        checklist: [
          { key: "chk-1", label: "Check feeder pipe flow at Sub-Station 2", done: true },
          { key: "chk-2", label: "Test tail-end residential connection", done: true },
          { key: "chk-3", label: "Interview 3 resident respondents", done: false },
        ],
        affectedStreets: ["School Lane", "Temple Road"],
        evidence: ["pressure_gauge_reading.jpg"],
        timeline: [
          { at: at0745, text: "Assigned to Ravi Kumar" },
          { at: at0800, text: "Ravi Kumar on site at ABC Colony feeder junction" },
          { at: at0815, text: "Observed pressure 0.8 bar (normal 1.8 bar)" },
        ],
      },
      history: [
        { state: "detected", at: at0715, note: "34 reports detected" },
        { state: "under_review", at: at0730, note: "Reviewed" },
        { state: "verification_assigned", at: at0745, note: "Assigned to Ravi Kumar" },
        { state: "verification_in_progress", at: at0800, note: "Field team en route" },
      ],
    },
    {
      id: "case-def-001",
      areaId: "area-def",
      wardId: "ward-24",
      stream: "water",
      severity: "normal",
      reportCount: 12,
      householdsAffected: 6,
      respondents: 12,
      breakdown: {
        sufficient: 8,
        insufficient: 3,
        lowPressure: 1,
        shortDuration: 0,
        noWater: 0,
      },
      plannedWindow: { start: "06:00", end: "07:00", plannedLitres: 280000 },
      availabilityVsExpected: "as_expected",
      reportFrequency: "low",
      historicalComparison: "normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: false,
      state: "verified",
      detectedAt: `${now}T06:30:00.000Z`,
      updatedAt: `${now}T07:15:00.000Z`,
      assignment: { assistantId: "fa-suresh", at: `${now}T06:45:00.000Z`, by: "u-supervisor-24" },
      verification: {
        assistantId: "fa-suresh",
        assignedAt: `${now}T06:45:00.000Z`,
        progress: 5,
        gpsActive: false,
        observedStart: "06:00",
        observedEnd: "07:00",
        durationMin: 60,
        pressure: "normal",
        availability: "normal",
        checklist: [
          { key: "chk-1", label: "Check supply pressure", done: true },
          { key: "chk-2", label: "Confirm regular flow", done: true },
        ],
        affectedStreets: [],
        evidence: ["flow_verified_ok.jpg"],
        notes: "Supply was delivered on schedule with standard pressure; reports were localized isolated airlocks.",
        submittedAt: `${now}T07:15:00.000Z`,
        timeline: [
          { at: `${now}T06:45:00.000Z`, text: "Assigned" },
          { at: `${now}T07:15:00.000Z`, text: "Verification completed - normal supply confirmed" },
        ],
      },
      history: [
        { state: "detected", at: `${now}T06:30:00.000Z`, note: "12 reports" },
        { state: "under_review", at: `${now}T06:40:00.000Z`, note: "Under review" },
        { state: "verification_assigned", at: `${now}T06:45:00.000Z`, note: "Assigned" },
        { state: "verification_in_progress", at: `${now}T06:50:00.000Z`, note: "Inspecting" },
        { state: "verified", at: `${now}T07:15:00.000Z`, note: "Verified normal" },
      ],
    },
    // Historical cases across Raichur wards
    {
      id: "case-xyz-h1",
      areaId: "area-xyz",
      wardId: "ward-24",
      stream: "water",
      severity: "high",
      reportCount: 84,
      householdsAffected: 84,
      respondents: 84,
      breakdown: { sufficient: 2, insufficient: 52, lowPressure: 15, shortDuration: 5, noWater: 10 },
      plannedWindow: { start: "07:00", end: "08:00", plannedLitres: 450000 },
      availabilityVsExpected: "significantly_below",
      reportFrequency: "high",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "forwarded",
      detectedAt: `${addDaysIso(now, -5)}T07:15:00.000Z`,
      updatedAt: `${addDaysIso(now, -4)}T11:00:00.000Z`,
      history: [{ state: "forwarded", at: `${addDaysIso(now, -4)}T11:00:00.000Z`, note: "Forwarded to Water Board" }],
    },
    {
      id: "case-w18-h1",
      areaId: "area-w18-1",
      wardId: "ward-18",
      stream: "water",
      severity: "high",
      reportCount: 65,
      householdsAffected: 60,
      respondents: 65,
      breakdown: { sufficient: 5, insufficient: 35, lowPressure: 15, shortDuration: 5, noWater: 5 },
      plannedWindow: { start: "06:00", end: "07:30", plannedLitres: 350000 },
      availabilityVsExpected: "significantly_below",
      reportFrequency: "high",
      historicalComparison: "below_normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "action_scheduled",
      detectedAt: `${addDaysIso(now, -2)}T06:45:00.000Z`,
      updatedAt: `${addDaysIso(now, -1)}T16:00:00.000Z`,
      departmentAction: {
        caseId: "case-w18-h1",
        actionType: "supply_adjustment",
        description: "Scheduled extra 45-minute supply booster run",
        status: "scheduled",
        scheduledFor: now,
        updatedAt: `${addDaysIso(now, -1)}T16:00:00.000Z`,
        by: "u-gov-water",
      },
      history: [{ state: "action_scheduled", at: `${addDaysIso(now, -1)}T16:00:00.000Z`, note: "Action scheduled" }],
    },
    {
      id: "case-w11-h1",
      areaId: "area-w11-1",
      wardId: "ward-11",
      stream: "water",
      severity: "moderate",
      reportCount: 40,
      householdsAffected: 32,
      respondents: 40,
      breakdown: { sufficient: 10, insufficient: 20, lowPressure: 10, shortDuration: 0, noWater: 0 },
      plannedWindow: { start: "06:00", end: "07:30", plannedLitres: 320000 },
      availabilityVsExpected: "below",
      reportFrequency: "medium",
      historicalComparison: "normal",
      aiAssessment: AI_ASSESSMENT,
      verificationRequired: true,
      state: "resolved",
      detectedAt: `${addDaysIso(now, -8)}T06:30:00.000Z`,
      updatedAt: `${addDaysIso(now, -7)}T14:00:00.000Z`,
      history: [{ state: "resolved", at: `${addDaysIso(now, -7)}T14:00:00.000Z`, note: "Resolved by line flushing" }],
    },
  ];

  // Materialise individual reports for active cases
  const waterReports: WaterReport[] = [];

  // 78 reports for case-xyz-001
  for (let i = 1; i <= 78; i++) {
    const hhId = i === 1 ? "H-1024" : `H-${1000 + (i % 50)}`;
    waterReports.push({
      id: `wr-xyz-${i}`,
      householdId: hhId,
      areaId: "area-xyz",
      wardId: "ward-24",
      caseId: "case-xyz-001",
      date: now,
      submittedAt: `${now}T07:${String(10 + (i % 45)).padStart(2, "0")}:00.000Z`,
      experience: i % 8 === 0 ? "no_water" : i % 3 === 0 ? "low_pressure" : "less_than_usual",
      durationMin: i % 8 === 0 ? 0 : 25,
      satisfied: false,
      status: "grouped",
    });
  }

  // 56 reports for case-ghi-001
  for (let i = 1; i <= 56; i++) {
    waterReports.push({
      id: `wr-ghi-${i}`,
      householdId: `H-${1100 + i}`,
      areaId: "area-ghi",
      wardId: "ward-24",
      caseId: "case-ghi-001",
      date: now,
      submittedAt: `${now}T07:${String(35 + (i % 25)).padStart(2, "0")}:00.000Z`,
      experience: i % 4 === 0 ? "low_pressure" : "less_than_usual",
      durationMin: 35,
      satisfied: false,
      status: "grouped",
    });
  }

  // 34 reports for case-abc-001
  for (let i = 1; i <= 34; i++) {
    const hhId = i === 1 ? "H-1088" : `H-${1200 + i}`;
    waterReports.push({
      id: `wr-abc-${i}`,
      householdId: hhId,
      areaId: "area-abc",
      wardId: "ward-24",
      caseId: "case-abc-001",
      date: now,
      submittedAt: `${now}T06:${String(45 + (i % 40)).padStart(2, "0")}:00.000Z`,
      experience: i % 3 === 0 ? "low_pressure" : "less_than_usual",
      durationMin: 30,
      satisfied: false,
      status: "grouped",
    });
  }

  // 12 reports for case-def-001
  for (let i = 1; i <= 12; i++) {
    waterReports.push({
      id: `wr-def-${i}`,
      householdId: `H-${1300 + i}`,
      areaId: "area-def",
      wardId: "ward-24",
      caseId: "case-def-001",
      date: now,
      submittedAt: `${now}T06:${String(15 + (i % 35)).padStart(2, "0")}:00.000Z`,
      experience: i > 8 ? "less_than_usual" : "sufficient",
      durationMin: 60,
      satisfied: i <= 8,
      status: "verified",
    });
  }

  return { waterSchedules, waterReports, waterCases, fieldAssistants };
}
