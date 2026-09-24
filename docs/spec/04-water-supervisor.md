# 04 — Water (Citizen, Supervisor, Government)

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

Covers `/citizen/setup/water`, `/citizen/water`, `/citizen/water/reports/[id]`, `/citizen/water/area`, the supervisor water module (8 screens), the case state machine, and `/gov/water` + `/gov/cases`. Sample area: **XYZ Colony, Ward 24** — planned supply **7:00–8:00 AM daily**, **4,50,000 L** for the colony.

---

## 1. Water setup `/citizen/setup/water`

All fields skippable.

1. **Usage points** (multi-select): Kitchen tap · Bathroom (2) · Washing area · Garden · Overhead tank · Borewell · RO purifier.
2. **Area / supply zone**: Ward 24 · XYZ Colony (pre-filled from household).
3. **Supply schedule** (read-only from seed, editable): **7:00–8:00 AM · Daily · Planned 4,50,000 L (colony)**.
4. **Storage**: Overhead tank capacity 1,000 L · Sump 2,000 L.
5. **Regional scarcity impact** card: "XYZ Colony is in a moderate-stress supply zone. Reporting your daily supply experience helps the ward balance supply." (`Estimated`).

CTA **Save & open Water Portal**.

---

## 2. Water Portal Home `/citizen/water`

- **Today's planned supply** card: **XYZ Colony · 7:00–8:00 AM · Planned 4,50,000 L** · Current status **🟢 Supply as scheduled** (or 🟡 Concern under review when an open case exists for the area).
- Estimated household availability: **~640 L/day** (`Estimated · Medium confidence`).
- Quick CTA **Report Water Issue** → §3.
- Cards: **My Reports** (latest 3 with status) · **Area Water Status** (→ `/citizen/water/area`) · **Supply Details** (schedule, frequency, storage tips).
- Active official water alert → `AlertBanner`.

---

## 3. Report flow (single route, stepper)

### Step 1 — Supply Details
Read-only summary: XYZ Colony · 7:00–8:00 AM · Planned 4,50,000 L · date today. **Continue**.

### Step 2 — Water Experience
"How was today's water supply?" (choice grid, one):
- Sufficient · **Less than usual** · Very low · No water · Low pressure · Short duration
Selecting *Sufficient* ends with "Thanks — logged as sufficient." and a positive report.

### Step 3 — Issue Details
- What happened? (textarea, optional) — sample "Water came only for about 30 minutes with low pressure."
- Duration received (minutes, stepper) — 30
- Was your requirement satisfied? Yes / Partially / **No**
- Optional photo/video (upload accepted, stored as name only, `Simulated upload`)
- **Submit report**

### Step 4 — Report Submitted
Card: **Report ID WR-24-0913** · Time 8:12 AM · Issue Less than usual · Status **Submitted → AI Area Analysis**. Buttons **Track my report** · **Back to Water Home**. Toast "Report submitted." A notification "Your water report WR-24-0913 has been received" is created.

---

## 4. My Report `/citizen/water/reports/[id]`

`StatusTimeline` with five citizen-facing steps mapped from the case state:

| Step | Case states |
|---|---|
| 1 Submitted | report exists |
| 2 AI Area Analysis | detected, under_review |
| 3 Supervisor Review | under_review, verification_assigned |
| 4 Field Verification | verification_in_progress, verified, not_confirmed, needs_more |
| 5 Department Action | forwarded, action_scheduled, resolved |

- Header: Report ID · date · issue · linked case "Grouped with 77 other reports from XYZ Colony" (count only).
- Latest update line, e.g. "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM."
- Updates live as the supervisor/gov advance the case.

---

## 5. Area Water Status `/citizen/water/area`

- Overall status **🔴 Concern detected — under verification** (tone by case severity).
- Aggregated reports today: **78** · Sufficient 18 · Less than usual/very low/no water 61 · Low pressure 11 · Short duration 6 (counts only).
- "Concern detected?" Yes — "Possible supply-demand gap identified by AI. Supervisor review in progress."
- Latest verified update (when available): "Field verification completed 7:42 AM — low pressure observed on streets A, B, C."
- Planned supply card and 7-day history strip.

---

## 6. Supervisor Water — 8 screens

Header badge `Ward 24`. Aggregates and counts only.

### 6.1 Dashboard `/supervisor/water`
KPI cards: **Assigned Areas 12** · **Active Water Concerns 5** · **Pending Verification 3** · **Field Teams Available 6** · **Reports Verified Today 8**.

Area table:

| Area | Status | Reports | Stage |
|---|---|---|---|
| XYZ Colony | 🔴 High | 78 | Pending |
| ABC Colony | 🟡 Moderate | 34 | In Progress |
| DEF Colony | 🟢 Normal | 12 | Verified |
| GHI Colony | 🔴 High | 56 | Pending |

Row click → Area Water Report. Section **AI Water Supply Alerts** below.

### 6.2 AI Water Supply Alerts
Grouped case cards, e.g.:
- **🔴 HIGH · XYZ Colony** · 78 households · planned supply 7–8 AM · availability significantly below expected · frequency high · historical comparison: below normal · **AI assessment: possible supply-demand gap** · **Field verification required**. Buttons **Open case** · **View area report**.
- 🔴 HIGH · GHI Colony · 56 households · verification assigned (Arif Khan).
- 🟡 MODERATE · ABC Colony · 34 households · verification in progress (Suresh M).
- 🟢 NORMAL · DEF Colony · 12 households · verified.

### 6.3 Area Water Report `/supervisor/water/areas/[areaId]` (XYZ)
- Planned supply: 7:00–8:00 AM · 4,50,000 L · daily.
- Citizen feedback split: **Insufficient 61 · Low pressure 11 · Short duration 6** (donut + counts) of 78 reports; households in area 340; reporting share 23 %.
- Historical comparison: last 30 days average 9 reports/day → today 78 (chart).
- AI analysis (verbatim): "Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area's planned supply and historical pattern."
- CTA **Go to Verification Decision**.

### 6.4 Verification Decision `/supervisor/water/cases/[caseId]` (state `under_review`)
Three actions with notes field:
- **Assign Field Verification** → §6.5
- **Mark for Monitoring** (state stays `under_review`, flag monitoring, toast)
- **Request More Information** (state `needs_more`, citizen notification "Supervisor requested more detail on today's supply")

### 6.5 Assign Field Assistant
- Assistant picker: **Ravi Kumar** (available) · Arif Khan (on GHI case) · Suresh M (on ABC case) · Team 04 (available).
- Priority: High / Medium · Deadline: today 12:00 PM.
- **Field checklist (8 items):**
  1. Confirm supply start time at the main valve
  2. Confirm supply end time
  3. Measure or observe pressure at 3 representative points
  4. Estimate availability vs planned (litres / duration)
  5. List affected streets
  6. Check for visible pipeline issues on the route
  7. Collect photo / video evidence
  8. Note citizen statements (count, no names)
- **Assign** → state `verification_assigned`; toast "Assigned to Ravi Kumar"; citizen notification "Field verification assigned for XYZ Colony".

### 6.6 Live Field Verification (`verification_in_progress`)
- Status strip: **GPS active** · assistant Ravi Kumar · started 7:05 AM.
- Fields updating live: availability (Low / Partial / As planned) · start time · end time · pressure (Low / Normal / High) · affected streets · evidence count.
- Demo control **Simulate field update** (`DemoControl`, amber dashed): each click advances — (1) arrived on site, (2) supply started 7:12 AM, (3) low pressure on 3 points, (4) supply ended 7:42 AM, (5) evidence uploaded → report submitted. Also a **Simulate department action** control appears once forwarded.

### 6.7 Field Verification Report (`verified` pending validation)
- Observed supply **7:12–7:42 AM · 30 min** (planned 60 min) · Pressure **Low** · Availability **Partial** · Affected streets **A, B, C** · Evidence 3 photos (simulated) · Checklist 8/8 · Assistant Ravi Kumar · Remarks "Supply shorter than planned; pressure low across surveyed points."

### 6.8 Supervisor Validation
Buttons: **Confirm** (→ `verified`) · **Reject** (→ `not_confirmed`, citizen notified "Field verification did not confirm a supply gap today") · **Needs Further Verification** (→ `needs_more`). After Confirm: **Forward to Water Department** (→ `forwarded`) with summary text auto-filled; toast "Forwarded to Water Supply Board"; gov notification "Verified case forwarded from Ward 24 — XYZ Colony".

### 6.9 Verified Reports & Department Updates `/supervisor/water/verified`
Table: Case · Area · Reports · Verified on · Forwarded · Department status. Department response card (verbatim): **"Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM. 🟢 Action Scheduled"**. Resolved rows show 🟢 Resolved with date.

---

## 7. Case state machine (engine `water.ts`)

```
detected → under_review → verification_assigned → verification_in_progress
        → verified | not_confirmed | needs_more
verified → forwarded → action_scheduled → resolved
needs_more → verification_assigned   (re-assign)
```

Events: `review`, `assign(assistant)`, `start_field`, `field_update`, `submit_field_report`, `confirm`, `reject`, `needs_more`, `forward`, `schedule_action(departmentAction)`, `resolve`. Illegal transitions throw.

Grouping: reports in the same area and supply window form a case when **≥10 reports or ≥5 % of households**. Severity: **High** if >30 % of respondents report insufficient/no water · **Moderate** 10–30 % · else **Normal**.

Seeded cases: `case-xyz-001` (78, under_review) · `case-ghi-001` (56, verification_assigned) · `case-abc-001` (34, verification_in_progress) · `case-def-001` (12, verified) · historical `case-xyz-h1` forwarded · `case-w18-h1` action_scheduled · `case-w11-h1` resolved · `case-w07-h1` detected · `case-w21-h1` not_confirmed · `case-w15-h1` needs_more.

---

## 8. Government Water `/gov/water` (Water Supply Board)

- KPIs: **Current demand 11.8M L/day** · **Historical 10.9M L/day** · **Forecast 12.4M L/day** (`Estimated · Medium confidence`) · Participating households 4,860 · Active cases 5.
- High-demand areas: **🔴 Ward 24** (+8.3 % vs baseline, significantly higher) · **🟡 Ward 18** (higher than baseline) · **🟢 Ward 11** (normal).
- Area-wise comparison table (ward → area, status 🟢/🟡/🔴, current vs baseline, forecast).
- Supply requirement card: forecast 12.4M L vs planned capacity 12.0M L → "Estimated shortfall 0.4M L/day — planning information; operational decisions remain with the department."
- Alerts: "Water demand higher than historical baseline in Ward 24", "Forecasted water requirement increased".
- Links: Heatmap (Water layer) · Cases · Publish water supply disruption alert.

---

## 9. Government Cases `/gov/cases`

- Table of forwarded verified cases: Case · Ward/Area · Reports · Verified summary (7:12–7:42 AM, low pressure, streets A/B/C) · Forwarded on · Status.
- **Record department action** dialog: Action type (Supply adjustment / Pressure boost / Pipeline inspection / Tanker dispatch) · Schedule (date + window) · New planned supply (start/end, e.g. **7:00–8:15 AM**) · Note.
- Save → state `action_scheduled`; toast "Action recorded"; notifications to supervisor (Ward 24) and citizens in the area: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM."
- **Mark resolved** → `resolved`; closing citizen notification "Your water report WR-24-0913 is resolved — supply adjusted to 7:00–8:15 AM."
- Demo control **Simulate department action** fills the dialog with the sample values.

---

## 10. Wording rules

- Supervisor alerts say "possible supply-demand gap"; the supervisor and field team establish facts.
- Never "leak", "pipe broken", "valve failure" in AI copy; field observations are reported as observations.
- No household id, name or street-level personal data in supervisor/gov views (streets appear only in field observations, never tied to a household).
- Every citizen report gets a closing notification when the case resolves or is not confirmed.
