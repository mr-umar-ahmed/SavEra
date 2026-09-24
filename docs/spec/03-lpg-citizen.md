# 03 — LPG (Citizen, Supervisor, Government)

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

Covers `/citizen/setup/gas`, `/citizen/gas`, `/citizen/gas/cylinder`, `/citizen/gas/history`, the supervisor LPG module `/supervisor/gas` (9 screens) and `/gov/gas`. Sample values: primary household **H-1024** (normal cycle) and **H-1088** (abnormal cycle). Dates are relative to `demoNow`: current cylinder started `demoNow − 18 days`; the two previous cycles were 25 days each immediately before. With `demoNow = 2026-10-10` that gives Aug 1–26, Aug 27–Sep 21, current from Sep 22 (the master prompt's anchors).

---

## 1. Gas & Heating setup `/citizen/setup/gas`

Every field has **Skip for now** / **Set up later**.

1. **Gas type** (choice grid): **LPG cylinder** · Piped municipal gas (PNG) · Both · None.
2. **Cylinder size** (choice grid): 5 kg · **14.2 kg** · 19 kg.
3. **Provider** (select): LPG Distribution Cell (Raichur) · Other (free text). Never a real brand.
4. **Number of cylinders in use**: 1 (stepper).
5. **First cylinder**: Refill date (date) · Start date (date, default = refill date) · optional note.
6. Piped gas branch: monthly SCM reading and bill amount (manual), labelled `Measured`.

CTA **Save & open LPG Dashboard**. Toast: "LPG setup saved."

---

## 2. LPG Dashboard `/citizen/gas`

PageHeader: eyebrow `LPG`, title **Your LPG**, chip `Estimated · Medium confidence` (inputs: 2 finished cylinders, current cylinder dates). Active LPG official alert → banner.

- **Current cylinder** card: **14.2 kg** · Started **22 Sep 2026** (`Measured`) · Days used **18** · Provider LPG Distribution Cell.
- **Estimated remaining:** **~7 days** (`Estimated`) · progress ring 72 % used (10.3 kg of 14.2 kg, estimated).
- **Average consumption:** **0.57 kg/day** (current cycle, estimated) vs typical **0.55–0.60 kg/day**.
- **Next expected refill:** **~17 Oct 2026** (`Estimated`) with "Basis: 14.2 kg ÷ blended rate of current (0.57) and typical (0.57) kg/day".
- **AI Consumption Insight** card (see §5).
- CTA **Update Cylinder** → `/citizen/gas/cylinder`. Secondary links: **My LPG Usage** (§4) · **Refill Prediction** (§7) · **Usage History** (`/citizen/gas/history`).

---

## 3. Add New Cylinder / Mark Finished `/citizen/gas/cylinder`

Tabs: **Add new cylinder** · **Mark current as finished**.

### Add new cylinder
- Size (5 / **14.2** / 19 kg) · Refill date · Start date · Provider. **Add cylinder**. Toast: "New cylinder added — tracking from 22 Sep 2026."
- If a cylinder is still open: prompt "Mark the current cylinder as finished first?" with **Finish and add**.

### Mark finished
- Shows current cylinder summary; Finish date (default today). **Mark finished**. Toast: "Cylinder finished after 18 days — 0.79 kg/day." Recomputes typical rate from finished cylinders.

---

## 4. My LPG Usage (section on dashboard, also `/citizen/gas/history` summary)

- KPI strip: **Current rate 0.57 kg/day** · **Current cycle 18 days (in progress)** · **Previous cylinder 25 days** · **Typical 25 days / cylinder**.
- Chart: bar per cycle — Aug 1–26 (25 d, 0.57 kg/day) · Aug 27–Sep 21 (25 d, 0.57 kg/day) · current (18 d so far, projected 25 d) — with a dashed typical line.
- All rates `Estimated`; dates `Measured`.

---

## 5. AI Consumption Insight

### H-1024 (normal)
- Status pill **Normal** (emerald). "Your typical consumption is ~0.55–0.60 kg/day. The current cylinder is tracking at 0.57 kg/day, within your usual range."

### H-1088 (abnormal — projected rate > typical × 1.2 after ≥5 days)
- Status pill **⚠️ Higher consumption detected** (amber/red by degree). Sample: typical 0.56 kg/day · current **0.74 kg/day** · **+32 %** · 12 days used · estimated remaining ~7 days (vs ~13 expected).
- Copy: "Your current cylinder is being used faster than your typical pattern."
- **Possible reasons** (possibilities, not causes):
  - More cooking or more people at home
  - Longer burner time or larger vessels
  - Change in cooking habits (festival, guests)
  - Burner efficiency — possible cause, further inspection may be required
  - **Possible leakage — check for safety**
- Never "leak detected". Link **Conservation & Safety Guidance** (§6). Also raises a citizen notification "Higher LPG consumption detected — review safety guidance".

---

## 6. Conservation & Safety Guidance (sheet)

- **Safety first:** if you smell gas, turn off the regulator, open windows, do not switch electrical appliances on or off, and contact your distributor's emergency line.
- Check the regulator, hose and connection for wear; replace hoses on the recommended schedule.
- Keep burners clean; a blue flame indicates efficient combustion.
- Use lids, pressure cookers and flat-bottomed vessels; soak pulses before cooking.
- Match flame size to the vessel; simmer on low.
- Turn the regulator off when not in use for long periods.
- Footer: "Guidance is general. SAVERA does not detect leaks or faults."

---

## 7. Refill Prediction

- **Expected refill date: ~17 Oct 2026** · range 15–19 Oct · `Estimated · Medium confidence`.
- **Basis:** "14.2 kg cylinder · started 22 Sep · blended rate 0.57 kg/day (current 0.57, typical 0.57)."
- Buttons: **Set Reminder** (choose 3 / 2 / 1 day before → creates a `Reminder` + notification; toast "Reminder set for 14 Oct 2026") · **Book Refill (simulated)** → `/citizen/services?tab=lpg` booking flow (Requested → Confirmed → Out for delivery → Delivered; `Simulated` chip).

---

## 8. Usage History `/citizen/gas/history`

Table (newest first):

| Cylinder | Started | Finished | Days | Rate (kg/day) | Status |
|---|---|---|---|---|---|
| cyl-3 (14.2 kg) | 22 Sep 2026 | — (in use) | 18 | 0.57 (est.) | Normal |
| cyl-2 (14.2 kg) | 27 Aug 2026 | 21 Sep 2026 | 25 | 0.57 | Normal |
| cyl-1 (14.2 kg) | 1 Aug 2026 | 26 Aug 2026 | 25 | 0.57 | Normal |

- Filters: last 3 / 6 / 12 cylinders. Line chart of kg/day per cycle vs typical band. Export CSV.
- Empty state: "No cylinders yet — add your first cylinder to start tracking." → `/citizen/gas/cylinder`.

---

## 9. Citizen LPG notifications

- "Refill expected around 17 Oct — book early to avoid running out." (reminder)
- "Higher LPG consumption detected — review safety guidance." (H-1088)
- "Booking BK-2041 confirmed (simulated) — delivery expected in 2 days."
- Official: "LPG distribution advisory for Ward 24: deliveries may be delayed on 12 Oct." (`Official`)

---

## 10. Supervisor LPG `/supervisor/gas` — 9 screens

Header badge `Ward 24`. Aggregates only: no household ids or names anywhere. Screens are sections/routes navigated from a left rail on the page: Dashboard → Ward/Area Overview → Consumption Heatmap → Area Consumption Details → AI Alerts → Demand Forecast → Requirement Planning → Reports & Trends → Notifications.

### 10.1 Dashboard
KPI cards (`Estimated` where derived):
- Assigned wards **1 (Ward 24)** · Total LPG households **1,240** · Active (tracking) **1,085**
- Consumed this month **17,200 kg** · Average per household **15.9 kg / month**
- Abnormal-consumption households **63** (count only)
- Current demand **1,270 cylinders / month** · Predicted next month **1,360 cylinders** (`Estimated · Medium confidence`)

### 10.2 Ward / Area Overview
Table: Area · Households · Consumption (kg) · Avg per household · Baseline · Status.

| Area | Households | This month | Baseline | Status |
|---|---|---|---|---|
| Area A · XYZ Colony | 340 | 4,300 kg | 4,250 kg | 🟢 Normal |
| Area B · ABC Colony | 310 | 4,900 kg | 4,100 kg | 🔴 High increase (+19.5 %) |
| Area C · DEF Colony | 290 | 3,950 kg | 3,900 kg | 🟢 Normal |
| Area D · GHI Colony | 300 | 4,050 kg | 3,300 kg | 🔴 Abnormally high (+22.7 %) |

### 10.3 Consumption Heatmap
`AreaMap` choropleth of Ward 24 with legend 🟢 Normal · 🟡 Increasing · 🔴 High increase. Area A Normal · B High · C Normal · D Abnormally High. Click an area → **Investigate** → §10.4. List view mirrors the map.

### 10.4 Area Consumption Details `/supervisor/gas/areas/[areaId]` (Area B sample)
- Households 310 · Active 278 · This month **4,900 kg** · Last month 4,200 kg · Baseline 4,100 kg · Change **+19.5 %** · Abnormal households **27** (count) · Trend chart (last 6 months) · Average 15.8 kg per household.
- AI note: "Consumption in this area is above its historical baseline. Possible contributors: seasonal cooking patterns, occupancy changes, or supply timing. Field inquiry may be considered." Never household-level.

### 10.5 AI Alerts
Card **⚠️ High LPG Consumption — Area B (ABC Colony)**: current 4,900 kg · baseline 4,100 kg · **+19.5 %** · households affected 27 · trend Increasing (3 months). Actions: **Mark for monitoring** · **Request field inquiry** · **Add note**. Second card for Area D. Resolved alerts collapse below.

### 10.6 Demand Forecast
- Monthly series: **Jan 58,000 kg · Feb 61,000 kg · Mar 63,000 kg → Apr ~66,000 kg** (`Estimated · Medium confidence`, "based on 3 months of representative data").
- Cylinder requirement: 66,000 ÷ 14.2 × 1.05 ≈ **4,880 cylinders**.
- Chart with forecast band ±7 %.

### 10.7 LPG Requirement Planning
Table Area → Ward → City roll-up:

| Level | Current cylinders | Predicted | Recommended stock |
|---|---|---|---|
| Area B | 4,300 | 4,650 | **4,650** |
| Ward 24 | 16,100 | 17,200 | 17,200 |
| City | 55,600 | 59,400 | 59,400 |

Note: "Planning information — operational decisions remain with the LPG Distribution Cell."

### 10.8 Reports & Trends
Monthly consumption trend, area comparison bars, abnormal-count trend, export CSV. Period picker 3 / 6 / 12 months.

### 10.9 Notifications
Seeded: "LPG consumption increasing in Area B", "Estimated LPG requirement updated for Ward 24", "Official advisory published for Ward 24".

---

## 11. Government LPG `/gov/gas` (LPG Distribution Cell)

- KPIs: **Current consumption 56,000 kg** · **Predicted next month 60,000 kg** (`Estimated · Medium confidence`) · Cylinder requirement **≈ 4,440** (60,000 ÷ 14.2 × 1.05) · Participating LPG households 4,120.
- History chart: **Jan 50k · Feb 53k · Mar 56k · Apr 58k → May ~60k** kg.
- Zone table: Zone 1 Normal · Zone 2 Increasing · Zone 3 High increase (+16 %). Drill-down Zone → Ward → Area with the same status labels (Normal / Increasing / High increase).
- Alerts: "LPG demand increasing across Zone 3", "Estimated LPG requirement updated".
- Links: Heatmap (LPG layer) · Forecast · Planning · Publish LPG distribution advisory (`/gov/alerts`).
- Note: "Planning information — operational decisions remain with the department."

---

## 12. Engine rules for LPG (§8.11, §8.13)

- `kgPerDay = sizeKg / days`; typical = median of finished cylinders.
- Abnormal when projected current rate > typical × 1.2 after ≥5 elapsed days.
- Refill date = start + size ÷ blended rate (current and typical).
- Aggregate status vs historical baseline: 🟢 ≤ +5 % · 🟡 +5–15 % (Increasing) · 🔴 > +15 % (High increase).
- Cylinder requirement = `ceil(kg ÷ 14.2 × 1.05)`.
- Every derived figure labelled `Estimated`; cylinder dates `Measured`.
