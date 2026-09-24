/**
 * Water case grouping, severity and the case state machine (MASTER_PROMPT §8.12, §9.8).
 * Pure: no clock, no randomness, no store access — timestamps are passed in.
 *
 * Grouping: citizen reports for the same area and planned supply window, dated within the last
 * 3 days, form a case when ≥ 10 reports or ≥ 5 % of the area's households report. An open case
 * (any state except resolved / not_confirmed) for the same area and window absorbs new reports.
 * Severity: share of respondents reporting insufficient (less than usual / very low) or no
 * water — > 30 % high · 10–30 % moderate · else normal.
 *
 * The AI only detects and groups. Its assessment always reads "possible supply-demand gap";
 * the supervisor decides, the field assistant verifies, the department acts.
 *
 * State machine:
 *   detected → under_review → verification_assigned → verification_in_progress
 *           → verified | not_confirmed | needs_more
 *   verified → forwarded → action_scheduled → resolved · needs_more → verification_assigned
 * `monitor` and `request_info` keep the state and add a note. Illegal transitions throw.
 */

import type {
  Area,
  AvailabilityVsExpected,
  CaseEvent,
  CaseSeverity,
  CaseState,
  FieldChecklistItem,
  FieldVerification,
  HistoricalComparison,
  IsoDate,
  IsoDateTime,
  ReportFrequency,
  TimelineStep,
  WaterBreakdown,
  WaterCase,
  WaterExperience,
  WaterReport,
  WaterSupplySchedule,
} from "@/types";
import { WATER_CASE } from "@/data/catalogue/thresholds";
import { daysBetween } from "@/lib/dates";

/** Verbatim AI assessment text (§8.12) — never a physical cause. */
export const AI_ASSESSMENT =
  "Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area's planned supply and historical pattern.";

/** Reports dated today or within the previous `CASE_WINDOW_DAYS − 1` days group together. */
export const CASE_WINDOW_DAYS = 3;

/** Report-frequency bands by report count. */
export const REPORT_FREQUENCY_THRESHOLDS = { high: 50, medium: 20 } as const;

/** Demo field-verification progress steps (0 = assigned … 5 = report ready). */
export const FIELD_PROGRESS_MAX = 5;

/** States in which a case no longer absorbs reports. */
export const CLOSED_CASE_STATES: readonly CaseState[] = ["resolved", "not_confirmed"];

export const DEFAULT_FIELD_CHECKLIST: readonly string[] = [
  "Reach the reported area during the supply window",
  "Confirm supply start time",
  "Measure approximate duration of supply",
  "Assess pressure at 3 points",
  "Note affected streets",
  "Collect photo/video evidence",
  "Speak with 3–5 households",
  "Record any visible infrastructure issue",
];

/** One demo "Simulate field update" step: a verification patch plus its timeline text. */
export interface SimulatedFieldUpdate {
  patch: Partial<FieldVerification>;
  text: string;
}

/** Five successive demo updates; applied in order they produce the spec's field report. */
export const SIMULATED_FIELD_UPDATES: readonly SimulatedFieldUpdate[] = [
  {
    patch: { gpsActive: true, notes: "Assistant on site at the main valve." },
    text: "GPS active — assistant at XYZ Colony",
  },
  {
    patch: { observedStart: "07:12", availability: "low" },
    text: "Supply started 7:12 AM",
  },
  {
    patch: { pressure: "low", affectedStreets: ["Street A", "Street B"] },
    text: "Pressure low at Street B junction",
  },
  {
    patch: {
      observedEnd: "07:42",
      durationMin: 30,
      affectedStreets: ["Street A", "Street B", "Street C"],
    },
    text: "Supply ended 7:42 AM — 30 min",
  },
  {
    patch: {
      evidence: ["photo-01.jpg", "photo-02.jpg", "video-01.mp4"],
      notes: "Supply shorter than planned; pressure low across surveyed points.",
    },
    text: "Evidence uploaded; report ready",
  },
];

// ---------------------------------------------------------------------------
// Breakdown, severity and derived labels
// ---------------------------------------------------------------------------

export function emptyBreakdown(): WaterBreakdown {
  return { insufficient: 0, lowPressure: 0, shortDuration: 0, noWater: 0, sufficient: 0 };
}

/** Which breakdown bucket a citizen's experience counts in. */
export function breakdownKeyOf(experience: WaterExperience): keyof WaterBreakdown {
  switch (experience) {
    case "sufficient":
      return "sufficient";
    case "less_than_usual":
    case "very_low":
      return "insufficient";
    case "no_water":
      return "noWater";
    case "low_pressure":
      return "lowPressure";
    case "short_duration":
      return "shortDuration";
  }
}

export function breakdownOf(reports: WaterReport[]): WaterBreakdown {
  const b = emptyBreakdown();
  for (const r of reports) b[breakdownKeyOf(r.experience)] += 1;
  return b;
}

export function addBreakdown(a: WaterBreakdown, b: WaterBreakdown): WaterBreakdown {
  return {
    insufficient: a.insufficient + b.insufficient,
    lowPressure: a.lowPressure + b.lowPressure,
    shortDuration: a.shortDuration + b.shortDuration,
    noWater: a.noWater + b.noWater,
    sufficient: a.sufficient + b.sufficient,
  };
}

/** Share (0–1) of respondents reporting insufficient or no water. */
export function shortfallShare(breakdown: WaterBreakdown, respondents: number): number {
  if (!(respondents > 0)) return 0;
  return Math.min(1, (breakdown.insufficient + breakdown.noWater) / respondents);
}

/** > 30 % high · 10–30 % moderate · else normal. */
export function assessSeverity(breakdown: WaterBreakdown, respondents: number): CaseSeverity {
  const pct = shortfallShare(breakdown, respondents) * 100;
  if (pct > WATER_CASE.highSharePct) return "high";
  if (pct >= WATER_CASE.moderateSharePct) return "moderate";
  return "normal";
}

export function availabilityFromShare(share: number): AvailabilityVsExpected {
  const pct = share * 100;
  if (pct > WATER_CASE.highSharePct) return "significantly_below";
  if (pct >= WATER_CASE.moderateSharePct) return "below";
  return "as_expected";
}

export function reportFrequencyOf(reportCount: number): ReportFrequency {
  if (reportCount >= REPORT_FREQUENCY_THRESHOLDS.high) return "high";
  if (reportCount >= REPORT_FREQUENCY_THRESHOLDS.medium) return "medium";
  return "low";
}

export function isCaseOpen(c: WaterCase): boolean {
  return !CLOSED_CASE_STATES.includes(c.state);
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface GroupReportsInput {
  reports: WaterReport[];
  area: Area;
  schedule: WaterSupplySchedule;
  existing: WaterCase[];
  /** `YYYY-MM-DD` or a full timestamp; the date part drives the 3-day window. */
  now: IsoDate | IsoDateTime;
  /** Optional area history label; defaults to "below_normal" for a non-normal severity. */
  historical?: HistoricalComparison;
  /** Optional id for a newly created case (defaults to `case-<area>-NNN`). */
  caseId?: string;
}

const dateOf = (now: IsoDate | IsoDateTime): IsoDate => now.slice(0, 10);
const timestampOf = (now: IsoDate | IsoDateTime): IsoDateTime =>
  now.length > 10 ? now : `${now}T00:00:00.000Z`;

/** True when the report's supply date is today or within the previous 2 days. */
export function isInCaseWindow(reportDate: IsoDate, now: IsoDate | IsoDateTime): boolean {
  const d = daysBetween(reportDate, dateOf(now));
  return d >= 0 && d < CASE_WINDOW_DAYS;
}

/** Ungrouped reports for the area within the grouping window — the ones a case would absorb. */
export function candidateReports(i: Pick<GroupReportsInput, "reports" | "area" | "now">): WaterReport[] {
  return i.reports.filter(
    (r) => r.areaId === i.area.id && !r.caseId && isInCaseWindow(r.date, i.now),
  );
}

const distinctHouseholds = (reports: WaterReport[]): number =>
  new Set(reports.map((r) => r.householdId)).size;

/** Next free `case-<area-slug>-NNN` id. */
export function nextCaseId(area: Area, existing: WaterCase[]): string {
  const slug = area.id.replace(/^area-/, "");
  const ids = new Set(existing.map((c) => c.id));
  let n = existing.filter((c) => c.areaId === area.id).length + 1;
  let id = `case-${slug}-${String(n).padStart(3, "0")}`;
  while (ids.has(id)) {
    n += 1;
    id = `case-${slug}-${String(n).padStart(3, "0")}`;
  }
  return id;
}

function reassess(c: WaterCase): WaterCase {
  const share = shortfallShare(c.breakdown, c.respondents);
  return {
    ...c,
    severity: assessSeverity(c.breakdown, c.respondents),
    availabilityVsExpected: availabilityFromShare(share),
    reportFrequency: reportFrequencyOf(c.reportCount),
    verificationRequired: assessSeverity(c.breakdown, c.respondents) !== "normal",
  };
}

/**
 * Group the area's fresh reports: an open case for the same area and window absorbs them
 * (counts, breakdown and severity updated, state kept); otherwise a new `detected` case is
 * created once the ≥ 10 reports / ≥ 5 % of households rule is met. Returns the full case list
 * (untouched cases as-is, the updated or new case included). Use `candidateReports` to learn
 * which reports were grouped so their `caseId` can be set.
 */
export function groupReportsIntoCases(i: GroupReportsInput): WaterCase[] {
  const fresh = candidateReports(i);
  if (fresh.length === 0) return i.existing;
  const at = timestampOf(i.now);
  const households = distinctHouseholds(fresh);
  const affected = distinctHouseholds(fresh.filter((r) => r.experience !== "sufficient"));
  const addition = breakdownOf(fresh);

  const open = i.existing.find(
    (c) =>
      c.areaId === i.area.id &&
      isCaseOpen(c) &&
      c.plannedWindow.start === i.schedule.start &&
      c.plannedWindow.end === i.schedule.end,
  );

  if (open) {
    const updated = reassess({
      ...open,
      reportCount: open.reportCount + fresh.length,
      householdsAffected: open.householdsAffected + affected,
      respondents: open.respondents + households,
      breakdown: addBreakdown(open.breakdown, addition),
      updatedAt: at,
      history: [
        ...open.history,
        {
          state: open.state,
          at,
          note: `${fresh.length} new ${fresh.length === 1 ? "report" : "reports"} grouped into this case`,
        },
      ],
    });
    return i.existing.map((c) => (c.id === open.id ? updated : c));
  }

  const sharePct = i.area.householdCount > 0 ? (households / i.area.householdCount) * 100 : 0;
  const meetsRule = fresh.length >= WATER_CASE.minReports || sharePct >= WATER_CASE.minSharePct;
  if (!meetsRule) return i.existing;

  const severity = assessSeverity(addition, households);
  const created: WaterCase = {
    id: i.caseId ?? nextCaseId(i.area, i.existing),
    areaId: i.area.id,
    wardId: i.area.wardId,
    stream: "water",
    severity,
    reportCount: fresh.length,
    householdsAffected: affected,
    respondents: households,
    breakdown: addition,
    plannedWindow: {
      start: i.schedule.start,
      end: i.schedule.end,
      plannedLitres: i.schedule.plannedLitres,
    },
    availabilityVsExpected: availabilityFromShare(shortfallShare(addition, households)),
    reportFrequency: reportFrequencyOf(fresh.length),
    historicalComparison: i.historical ?? (severity === "normal" ? "normal" : "below_normal"),
    aiAssessment: AI_ASSESSMENT,
    verificationRequired: severity !== "normal",
    state: "detected",
    detectedAt: at,
    updatedAt: at,
    history: [
      {
        state: "detected",
        at,
        note: `Grouped ${fresh.length} reports from ${i.area.name} in the ${i.schedule.start}–${i.schedule.end} supply window`,
      },
    ],
  };
  return [...i.existing, created];
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

function illegal(c: WaterCase, ev: CaseEvent): never {
  throw new Error(`Illegal transition: '${ev.type}' is not allowed from state '${c.state}'`);
}

function checklistFrom(labels: readonly string[]): FieldChecklistItem[] {
  const source = labels.length > 0 ? labels : DEFAULT_FIELD_CHECKLIST;
  return source.map((label, idx) => ({ key: `item-${idx + 1}`, label, done: false }));
}

function markChecklist(items: FieldChecklistItem[], progress: number): FieldChecklistItem[] {
  const doneCount = Math.min(items.length, Math.ceil((items.length * progress) / FIELD_PROGRESS_MAX));
  return items.map((item, idx) => ({ ...item, done: idx < doneCount || item.done }));
}

function withHistory(c: WaterCase, state: CaseState, at: IsoDateTime, note?: string): WaterCase {
  return { ...c, state, updatedAt: at, history: [...c.history, { state, at, note }] };
}

/**
 * Apply an event to a case at time `at` (defaults to the case's `updatedAt` so the function
 * stays pure); `by` is the acting user id recorded on assignments and validations.
 * Every transition appends a history entry. Throws `Error('Illegal transition …')`.
 */
export function transitionCase(
  c: WaterCase,
  ev: CaseEvent,
  at: IsoDateTime = c.updatedAt,
  by = "system",
): WaterCase {
  switch (ev.type) {
    case "review": {
      if (c.state !== "detected") return illegal(c, ev);
      return withHistory(c, "under_review", at, "Supervisor review started");
    }
    case "assign": {
      if (c.state !== "under_review" && c.state !== "needs_more") return illegal(c, ev);
      const verification: FieldVerification = {
        assistantId: ev.assistantId,
        assignedAt: at,
        checklist: checklistFrom(ev.checklist),
        gpsActive: false,
        progress: 0,
        affectedStreets: [],
        evidence: [],
        timeline: [],
      };
      const next: WaterCase = {
        ...c,
        assignment: { assistantId: ev.assistantId, at, by },
        verification,
        validation: undefined,
      };
      return withHistory(next, "verification_assigned", at, "Field verification assigned");
    }
    case "start_verification": {
      if (c.state !== "verification_assigned" || !c.verification) return illegal(c, ev);
      const verification: FieldVerification = {
        ...c.verification,
        timeline: [...c.verification.timeline, { at, text: "Field verification started" }],
      };
      return withHistory(
        { ...c, verification },
        "verification_in_progress",
        at,
        "Field verification started",
      );
    }
    case "field_update": {
      if (c.state !== "verification_in_progress" || !c.verification) return illegal(c, ev);
      const v = c.verification;
      const progress = Math.min(FIELD_PROGRESS_MAX, v.progress + 1);
      const added = (ev.patch.timeline ?? []).map((e) => ({ at: e.at || at, text: e.text }));
      const verification: FieldVerification = {
        ...v,
        ...ev.patch,
        gpsActive: true,
        progress,
        checklist: markChecklist(ev.patch.checklist ?? v.checklist, progress),
        timeline: [...v.timeline, ...added],
      };
      const lastText = added.at(-1)?.text;
      return withHistory(
        { ...c, verification },
        "verification_in_progress",
        at,
        lastText ? `Field update ${progress}/${FIELD_PROGRESS_MAX} — ${lastText}` : `Field update ${progress}/${FIELD_PROGRESS_MAX}`,
      );
    }
    case "submit_field_report": {
      if (c.state !== "verification_in_progress" || !c.verification) return illegal(c, ev);
      const v = c.verification;
      const verification: FieldVerification = {
        ...v,
        progress: FIELD_PROGRESS_MAX,
        checklist: v.checklist.map((item) => ({ ...item, done: true })),
        submittedAt: at,
        timeline: [...v.timeline, { at, text: "Field report submitted" }],
      };
      return withHistory({ ...c, verification }, "verification_in_progress", at, "Field report submitted");
    }
    case "validate": {
      if (c.state !== "verification_in_progress") return illegal(c, ev);
      const validation = { decision: ev.decision, note: ev.note, at, by };
      const next: WaterCase = { ...c, validation };
      if (ev.decision === "confirm") {
        return withHistory(next, "verified", at, ev.note ?? "Field report confirmed by supervisor");
      }
      if (ev.decision === "reject") {
        return withHistory(
          next,
          "not_confirmed",
          at,
          ev.note ?? "Field verification did not confirm a supply gap",
        );
      }
      return withHistory(next, "needs_more", at, ev.note ?? "Further verification requested");
    }
    case "forward": {
      if (c.state !== "verified") return illegal(c, ev);
      return withHistory(c, "forwarded", at, "Forwarded to Water Supply Board");
    }
    case "department_action": {
      if (c.state !== "forwarded") return illegal(c, ev);
      const departmentAction = { ...ev.action, caseId: c.id };
      return withHistory(
        { ...c, departmentAction },
        "action_scheduled",
        at,
        ev.action.description || "Department action scheduled",
      );
    }
    case "resolve": {
      if (c.state !== "action_scheduled") return illegal(c, ev);
      const departmentAction = c.departmentAction
        ? { ...c.departmentAction, status: "completed" as const, updatedAt: at }
        : c.departmentAction;
      return withHistory({ ...c, departmentAction }, "resolved", at, "Resolved");
    }
    case "monitor": {
      if (c.state !== "under_review") return illegal(c, ev);
      return withHistory(c, "under_review", at, "Marked for monitoring");
    }
    case "request_info": {
      if (!isCaseOpen(c) || c.state === "detected") return illegal(c, ev);
      return withHistory(c, c.state, at, "More information requested from reporting households");
    }
  }
}

/** Build the demo `field_update` event for step `index` (0–4) timestamped `at`. */
export function simulatedFieldUpdateEvent(index: number, at: IsoDateTime): CaseEvent {
  const step = SIMULATED_FIELD_UPDATES[Math.min(SIMULATED_FIELD_UPDATES.length - 1, Math.max(0, index))];
  return { type: "field_update", patch: { ...step.patch, timeline: [{ at, text: step.text }] } };
}

// ---------------------------------------------------------------------------
// Citizen timeline
// ---------------------------------------------------------------------------

const STATE_LEVEL: Record<CaseState, number> = {
  detected: 1,
  under_review: 2,
  verification_assigned: 3,
  verification_in_progress: 4,
  verified: 5,
  not_confirmed: 5,
  needs_more: 5,
  forwarded: 6,
  action_scheduled: 7,
  resolved: 8,
};

/** Five citizen-facing steps mapped from the case state (spec 04 §4). */
export function caseTimeline(c: WaterCase): TimelineStep[] {
  const level = STATE_LEVEL[c.state];
  const firstAt = (states: CaseState[]): IsoDateTime | undefined =>
    c.history.find((h) => states.includes(h.state))?.at;

  const submitted: TimelineStep = {
    key: "submitted",
    label: "Submitted",
    state: "done",
    at: c.detectedAt,
    note: `Grouped with ${Math.max(0, c.reportCount - 1)} other ${c.reportCount === 2 ? "report" : "reports"} from the area`,
  };

  const analysis: TimelineStep = {
    key: "analysis",
    label: "AI Area Analysis",
    state: level === 1 ? "active" : "done",
    at: c.detectedAt,
    note: "Possible supply-demand gap identified — supervisor review required",
  };

  const review: TimelineStep = {
    key: "review",
    label: "Supervisor Review",
    state: level <= 1 ? "pending" : level <= 3 ? "active" : "done",
    at: firstAt(["under_review"]),
    note:
      c.state === "verification_assigned"
        ? "Field verification assigned"
        : c.state === "under_review"
          ? "Supervisor reviewing the area report"
          : undefined,
  };

  let verificationState: TimelineStep["state"];
  let verificationNote: string | undefined;
  if (level < 4) {
    verificationState = "pending";
  } else if (c.state === "verification_in_progress") {
    verificationState = "active";
    verificationNote = c.verification?.submittedAt
      ? "Field report submitted — awaiting supervisor validation"
      : "Field assistant on site";
  } else if (c.state === "needs_more") {
    verificationState = "active";
    verificationNote = "Further verification requested";
  } else if (c.state === "not_confirmed") {
    verificationState = "done";
    verificationNote = "Field verification did not confirm a supply gap";
  } else {
    verificationState = "done";
    verificationNote = c.verification
      ? `Verified — observed supply ${c.verification.observedStart ?? "—"}–${c.verification.observedEnd ?? "—"}`
      : "Verified by supervisor";
  }
  const verification: TimelineStep = {
    key: "verification",
    label: "Field Verification",
    state: verificationState,
    at: firstAt(["verification_in_progress"]),
    note: verificationNote,
  };

  const action: TimelineStep = {
    key: "action",
    label: "Department Action",
    state: level >= 8 ? "done" : level >= 6 ? "active" : "pending",
    at: firstAt(["forwarded"]),
    note:
      c.state === "not_confirmed"
        ? "Case closed — not confirmed"
        : c.state === "resolved"
          ? (c.departmentAction?.description ?? "Resolved")
          : c.state === "action_scheduled"
            ? c.departmentAction?.description
            : c.state === "forwarded"
              ? "Forwarded to Water Supply Board"
              : undefined,
  };

  return [submitted, analysis, review, verification, action];
}
