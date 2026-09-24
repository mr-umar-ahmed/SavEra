# 05 — Government Portal

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

City of Raichur portal for three department accounts (Electricity Department, Water Supply Board, LPG Distribution Cell). One shared city dashboard; the logged-in department is highlighted. Every figure is an aggregate (city → zone → ward → area). No household identifiers anywhere. Derived figures carry `Estimated · <confidence>`; simulated feeds carry `Simulated` / `Live feed (simulated)`.

Geography: Zone 1 · North, Zone 2 · Central, Zone 3 · South (contains Ward 24). Wards 03, 07, 09, 11, 15, 18, 21, 24.

---

## 1. Department landing `/gov`

- Header: **City of Raichur · Resource Intelligence** · department badge.
- Three department tiles: ⚡ Electricity Department · 💧 Water Supply Board · 🔥 LPG Distribution Cell. Logged-in department highlighted with "Your department"; others show "View".
- **City Dashboard** KPI groups:
  - 🏠 **Participating Households:** total 5,000 · active 4,320 · participation rate 86 %.
  - 💧 **Water:** current 11.8M L/day · historical 10.9M L · forecast 12.4M L (`Estimated`) · high-demand areas 3.
  - 🔥 **LPG:** consumption 56,000 kg · demand 3,950 cylinders · forecast 60,000 kg · cylinder requirement ≈ 4,440.
  - ⚡ **Electricity:** city demand 842 MW · DR events 1 active / 1 scheduled · active disruptions 1.
  - 🌱 **Sustainability:** average Green Score 78 · distribution 80–100: 38 % · 60–79: 41 % · 40–59: 17 % · <40: 4 % · improvement trend +3 pts (3 months).
- Drill-down breadcrumb **City → Zones → Wards → Areas** (each level a table with status pills).
- Alerts & notifications panel (§13).

---

## 2. Electricity Management `/gov/electricity`

Tabs: **Grid Operations · Automated Demand Response · Disruption Alerts**.

### 2.1 Grid Operations (city-scale, values from §6.12)
- KPI cards: **Active Smart Meters 45,230** (Network Uptime 99.9 %) · **Peak Demand (Raichur) 842 MW** (+12 % from average) · **Load Shedding 14.2 MW** (Averted via Smart DR) · **Alerts Dispatched 1,247** (Last 24 Hours). Chips `Live feed (simulated)`.
- **Regional Sensor Matrix:** North Sub-Station 70 % MODERATE (amber) · South Sector 45 % STABLE (emerald) · Industrial Zone 60 % STABLE (emerald) · Rural Feeder A 30 % OPTIMAL (cyan).
- **Aggregate Grid Demand** live area chart around ~842 MW, ticking every few seconds, labelled `LIVE FEED (simulated)`.
- **Live Incidents:** 🔴 CRITICAL Transformer Overload · Sector 4 · Just now · 🟡 WARNING Frequency Drop · Grid Feed Alpha · 1h ago.
- **Command Terminal** with tabs **Push Broadcast** / **City Portal Update**; broadcast type dropdown (Standard Advisory (Push) · Urgent Notice · Maintenance Window · Demand Response Request); message box placeholder "E.g. Power Command reports issue in Sector 4…"; target ward/area multiselect; **Send** → creates citizen + supervisor notifications for the selected areas; toast "Broadcast sent to 2 areas".

### 2.2 Automated Demand Response (ADR)
- Copy at top: "SAVERA can orchestrate configured, non-critical loads during demand-response events through compatible connected devices and authorised utility signals." Chip `Integration-ready · Simulated`.
- Events table: `dr-001` Active · today 6:00–8:00 PM · target 12 MW · Ward 24, Ward 18 · opted-in 1,840 households · averted 9.6 MW (simulated) · `dr-002` Scheduled · tomorrow 7:00–9:00 PM · 10 MW · Zone 3 · `dr-003` Completed · 8.2 MW averted.
- **Create DR event** dialog: window (date, start, end) · target MW · areas/wards · message. Save → event Scheduled; citizen event cards appear for opted-in households; toast "DR event created".
- Event detail: opt-in households (count), flexible loads (AC, EV charger, geyser) vs protected (fridge, medical), responses Approve / Auto / Decline (counts), simulated averted MW progress. **Start** / **Complete** controls; completing increments "Load Shedding Averted via Smart DR" KPI.
- Never "switches off everyone's appliances".

### 2.3 Disruption Alerts
Link card → `/gov/alerts` prefiltered to power interruption.

---

## 3. Water Management `/gov/water`
See spec 04 §8: current **11.8M L**, historical **10.9M L**, forecast **12.4M L**; high-demand 🔴 Ward 24 · 🟡 Ward 18 · 🟢 Ward 11; area-wise comparison; supply requirement; links to Cases and Alerts.

## 4. LPG Management `/gov/gas`
See spec 03 §11: current **56,000 kg**, predicted **60,000 kg**, cylinder requirement ≈ 4,440; history Jan 50k · Feb 53k · Mar 56k · Apr 58k → May ~60k; zone drill-down.

---

## 5. Resource Heatmap `/gov/heatmap`

- `AreaMap` of Raichur (centre 16.20 N, 77.35 E) with zone/ward/area polygons; layer switch **Water · LPG · Electricity**; level switch Zones / Wards / Areas.
- Legends:
  - Water: 🟢 Normal · 🟡 Higher than baseline · 🔴 Significantly higher
  - LPG: 🟢 Normal · 🟡 Increasing · 🔴 High increase
  - Electricity: load status Optimal (cyan) · Stable (emerald) · Moderate (amber) · Critical (red)
- Hover tooltip: name · current vs baseline · % change · households (count). Click → ward/area detail side panel with the same aggregates and a link to `/gov/wards`.
- Sample ward colours (water): 24 🔴 · 18 🟡 · 11 🟢 · 07 🟢 · 03 🟢 · 09 🟡 · 15 🟢 · 21 🟢.

---

## 6. Ward & Area Comparison `/gov/wards`

Table (from §6.15):

| Ward | Water | LPG | Overall |
|---|---|---|---|
| Ward 24 | High (+8.3 %) | Increasing (+9 %) | 🔴 |
| Ward 18 | Normal (+3 %) | Normal (+2 %) | 🟢 |
| Ward 11 | High (+7 %) | Normal (+1 %) | 🟡 |
| Ward 07 | Normal (+1 %) | Increasing (+6 %) | 🟡 |

- Other wards (03, 09, 15, 21) seeded 🟢/🟡. Sort and filter by stream/status. Columns: participating households (count), current, baseline, forecast.
- Row expand → area drill-down (e.g. Ward 24: XYZ 🔴, ABC 🟡, DEF 🟢, GHI 🔴) — never individual citizens. Export CSV.

---

## 7. AI Demand Forecast `/gov/forecast`

One screen, three panels (stream tabs or stacked):
- **Water:** next month 12.4M L/day (range 11.9–12.9M) · `Estimated · Medium confidence` · "based on 4 months of representative data" · drivers: seasonal factor, 3-month linear trend, participation growth.
- **LPG:** May ~60,000 kg (57,000–63,000) · cylinders ≈ 4,440 · same caveat.
- **Electricity:** peak next month ~860 MW (830–890) · `Low confidence` · "based on simulated grid feed".
- Chart per stream: history + forecast band. Method note: "Demand forecast = linear trend of the last 3–4 months × seasonal factor."

---

## 8. Resource Planning `/gov/planning`

- **Water:** requirement 12.4M L/day · current supply 11.8M L · forecast 12.4M L · high-demand areas (Ward 24, 18, 11) · suggested actions: schedule review for Ward 24, tanker standby for XYZ/GHI Colony (planning suggestions, labelled `Estimated`).
- **LPG:** demand 56,000 kg · forecast 60,000 kg · cylinders ≈ 4,440 · zone split (Zone 3 highest) · Ward 24 Area B 4,300 → 4,650 cylinders.
- Footer note (verbatim): "Planning information — operational decisions remain with the department."
- Export planning summary CSV.

---

## 9. City Analytics & Reports `/gov/analytics`

- **Water:** daily demand (30 days) · monthly (12 months) · MoM change **+8.3 %** · area trends (top 5 rising, top 5 falling).
- **LPG:** monthly consumption · demand change **+3.6 %** · zone breakdown · cylinder requirement history.
- **Electricity:** peak demand by day · DR averted MW by event.
- **Participation:** households 5,000 · active 4,320 · new this month 210 · Ward 24 700 participants.
- **Export CSV** per table (client-side blob download).

---

## 10. City Green Score `/gov/green-score`

- **Average 78 / 100** · histogram: **80–100** 38 % (1,900) · **60–79** 41 % (2,050) · **40–59** 17 % (850) · **<40** 4 % (200).
- Ward averages table (Ward 24 avg 81, Ward 18 76, Ward 11 74, …) · trend line (last 6 months).
- Note: "Aggregated only. Individual households are never shown. Scores are normalised per person and home type (see citizen Green Score)."

---

## 11. Cases `/gov/cases`
See spec 04 §9: forwarded verified reports → **Record department action** (type, schedule, new planned supply 7:00–8:15 AM) → status → citizen + supervisor notified → **Mark resolved**.

---

## 12. Official Alerts `/gov/alerts`

- **Publish alert** form (`Official` chip): Type — Planned power interruption · Water supply disruption · LPG distribution advisory · Stream auto from type · Areas/wards multiselect · Window (date, start, end) · Reason (text) · **Publish**.
- Voice intent "publish a power interruption alert for ward 24" opens this form prefilled; it never publishes on its own.
- Publishing → `OfficialAlert` active; targeted notifications to citizens and supervisors in the areas; banner on the relevant stream dashboard. Toast "Alert published to Ward 24".
- Alerts table: `alert-001` 🔴 Active · Water supply disruption · Ward 18 · today 6:00–10:00 AM · "Pipeline maintenance" · `alert-002` 🟢 Resolved · Planned power interruption · Ward 07.
- Row actions: **Post update** (status note → notification) · **Resolve** (→ resolved, closing notification, banner removed).
- Alerts are published by a department account, never generated by AI.

---

## 13. Alerts & Notifications `/gov/notifications`

Seeded examples:
- "Water demand higher than historical baseline in Ward 24"
- "LPG demand increasing across Zone 3"
- "Forecasted water requirement increased"
- "Estimated LPG requirement updated"
- "Verified case forwarded from Ward 24 — XYZ Colony"
- "DR event dr-001 active — 9.6 MW averted (simulated)"
Each links to the relevant screen; department filter defaults to the account's department.

---

## 14. Industrial Environmental Intelligence `/gov/industrial`

Tabs: **Emissions Map · GHG Accounting**. Both chips: `Simulated feeds` / `Accounting prototype`. Reference OCEMS only as "designed to integrate with".

### 14.1 Emissions Map
- Map of 8 units `ind-01…ind-08` (e.g. Raichur Textile Processing, Krishna Rice Mills, South Zone Cement Works, Industrial Zone Foundry, AgroChem Unit 2, Metal Fabrication Park, Cold Storage Cluster, Brick Kiln Cluster — fictional names).
- Status legend: 🟢 Within applicable limit · 🟡 Elevated · 🔴 Exceedance.
- Table: Unit · PM (µg/m³) · SO₂ · NOx · Status · Last update (simulated, minutes ago). Sample: ind-03 Cement Works PM 148 / SO₂ 62 / NOx 88 → 🔴 Exceedance; ind-01 PM 74 → 🟡 Elevated; others 🟢.
- Detail panel: readings vs configured thresholds (from `catalogue/thresholds.ts`, "demo thresholds — configurable"), 24 h sparkline.

### 14.2 GHG Accounting
- Per unit: activity data (fuel litres, electricity kWh, process tonnes) × emission factors → **CO₂e** by scope (Scope 1 fuel/process · Scope 2 electricity) · 6-month trend · city total (e.g. 4,820 tCO₂e/month).
- Reduction opportunities list (ranked, "may reduce"): fuel switch, process heat recovery, efficiency retrofits, on-site solar.
- Factors visible in "How this is calculated" panel; chip `Estimated`.

---

## 15. City Twin `/gov/twin`

- Title **Simulation — Digital Twin Prototype**. 3D `CityScene`: zones → wards → areas as blocks coloured by demand movement (status tone) for the selected stream; click drills down; 2D SVG fallback toggle.
- Side panel shows the selected level's aggregates and a link to the heatmap. Never labelled live.

---

## 16. Rules

- Aggregates only; counts, totals, averages, statuses.
- Status vs historical baseline: 🟢 ≤ +5 % · 🟡 +5–15 % · 🔴 > +15 %.
- Official alerts are department-published; AI alerts are informational and say "possible".
- Every forecast/requirement carries `Estimated` + confidence + the "based on N months of representative data" caveat.
- Planning screens repeat "operational decisions remain with the department".
