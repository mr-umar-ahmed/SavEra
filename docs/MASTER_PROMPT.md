# SAVERA — Master Build Prompt

**Target:** Claude Code (Fable 5.1). Paste this as the first message of a fresh session in an empty repo, or save it as `docs/MASTER_PROMPT.md` and say "Build SAVERA from docs/MASTER_PROMPT.md."
**Also put the six detailed flow documents in `docs/spec/`** (`01-platform-flow.md`, `02-electricity.md`, `03-lpg-citizen.md`, `04-water-supervisor.md`, `05-government-portal.md`, `06-connected-layer.md`). They are the screen-level source of truth. **Where a spec file and this prompt disagree, this prompt wins.**

---

## 0. Your operating rules (read first)

You are building **SAVERA**, an AI-powered household-to-city resource intelligence platform for **electricity, water and LPG**, as a hackathon-grade, fully clickable, mock-data-driven web prototype. Everything must *work* — every route, every button, every flow — with seeded, realistic, deterministic data. No backend or database is required.

1. Before writing any code, think hard about the architecture (Section 3) and the build order (Section 12). Read this whole file and every file in `docs/spec/`.
2. Do not stop to ask me questions unless you are truly blocked. Make a sensible decision, record it in `DECISIONS.md`, and keep going.
3. **No placeholder screens.** Every route in Section 5 renders real (seeded) data with real interactions. No "coming soon", no lorem ipsum, no `TODO` in the UI.
4. Maintain `CLAUDE.md` (stack, conventions, how to run, demo accounts, project structure) and `DECISIONS.md` (every deviation from this prompt, with reason).
5. Work phase by phase (Section 12). After each phase: `npm run typecheck && npm run lint && npm run test`, fix everything, commit as `feat(phase-N): …`, update `CLAUDE.md`.
6. Numbers come from deterministic engine code (Section 8), never from an LLM. An LLM may only *rephrase* explanations, and only if an API key is present. The app must run with no keys.
7. Every product rule in Section 2 is a hard requirement, not a suggestion. They are what makes SAVERA defensible in front of a jury.

---

## 1. Positioning (use this copy on the landing page and in the README)

> **SAVERA is an AI-powered resource intelligence and action platform** that measures household electricity, water and LPG usage, builds personalised baselines, detects abnormal consumption, predicts next-month consumption and cost, gives actionable recommendations, connects citizens with utility services, and — through digital simulation, authorised integrations, compatible hardware and human-verified government workflows — helps translate digital insight into real-world resource-saving action.

Two layers, always presented together:

- **Software layer:** measure → analyse → predict → recommend → coordinate.
- **Connected layer:** simulate → integrate → control/automate *where supported*.

Three portals, one data loop: **Citizen** (household) → anonymised aggregation → **Area Supervisor / Councillor** (ward) → **Government Department** (city). Household data improves individual insight; aggregated data becomes area and city demand intelligence.

The one-line story per stream:

- Electricity: "Digitise my home → understand where electricity went → know next month's bill → act."
- Water: "Report my supply experience → AI groups the area → supervisor verifies on the ground → department adjusts → I'm notified."
- LPG: "Track my cylinder → understand my consumption → get alerted when usage changes → predict my refill."

---

## 2. Non-negotiable product rules

1. **Estimates are labelled estimates.** Appliance-level kWh, forecasts, bill ranges, water availability, refill dates, city demand — every derived number shows an `Estimated` chip and a confidence level (High / Medium / Low) with a tooltip listing the inputs used. Measured values (a bill's total kWh, a cylinder's dates) are not labelled estimated.
2. **AI never asserts a physical cause.** It says "possible contributors" and "possible cause — further inspection may be required". It never says "your AC is faulty", "there is a leak", or "the pipe is broken". Supervisor water alerts say "possible supply-demand gap"; the supervisor and field team establish facts.
3. **Never block the user.** Every onboarding field has *Skip for now* and *Set up later*. The dashboard works with one bill and an incomplete appliance list. Completeness is shown as a score, not a gate.
4. **Privacy by aggregation.** Supervisors and government see area/ward/zone/city aggregates and counts — never an individual household's data. Leaderboard display names are opt-in; default is `Green Home #<n>`.
5. **Green Score is normalised**, not "lowest consumption wins" (Section 8.9).
6. **Simulation is labelled simulation.** The digital twin is titled "Simulation" / "Digital Twin Prototype", never "live".
7. **No fake integrations.** Payments, LPG booking, government data import, OCR, IoT control and emissions feeds are all *simulated* and visibly labelled `Simulated` or `Integration-ready`. Never imply that a real utility, provider, API (API Setu, BBPS, OCEMS, Matter/OpenADR) or device is connected. Reference those standards only as "designed to integrate with".
8. **Official alerts are official.** Disruption alerts are published by a department account, never generated by AI.
9. **Human in the loop.** AI detects and groups; supervisor decides; field verifies; department acts; citizen is notified. Operational decisions stay with the responsible department.
10. **Indian context throughout.** ₹, kWh, litres, kg, 14.2 kg cylinders, wards/colonies, BEE star ratings, PIN codes. Demo city: **Raichur, Karnataka**. Use generic department names (Electricity Department, Water Supply Board, LPG Distribution Cell) — do not brand as real utilities or providers.

---

## 3. Tech stack (defaults — change only for a hard blocker, and log it)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript strict, React 19 |
| UI | Tailwind CSS + shadcn/ui, lucide-react icons, Framer Motion |
| State | Zustand with `persist` (localStorage) so a demo survives refresh; "Reset demo data" in header |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Maps | MapLibre GL (or react-leaflet) with OSM tiles; hand-authored approximate GeoJSON polygons for Raichur zones/wards/areas; choropleth by status |
| 3D | react-three-fiber + drei (landing hero, digital twin); a 2D SVG fallback toggle for low-end devices |
| Voice | Web Speech API (`SpeechRecognition` + `speechSynthesis`), text-command fallback |
| Scan | `html5-qrcode` (camera) with manual-code fallback |
| OCR | Simulated (upload → 1.5 s "processing" → mock extraction). Stretch: `tesseract.js` client-side |
| Data | Seeded, deterministic (seeded PRNG) TypeScript modules in `src/data/`; async mock API layer in `src/lib/api/` returning typed results so a real backend can replace it |
| AI engine | Pure TypeScript in `src/lib/engine/`, unit-tested with Vitest. Optional `ExplanationProvider` interface: rule-based templates by default; Anthropic-backed rephrasing only if `ANTHROPIC_API_KEY` is set |
| Tests | Vitest (engine), Playwright smoke test of the demo script (Phase 8) |
| Tooling | ESLint, Prettier, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run dev` |

Suggested structure:

```
src/
  app/                 routes (Section 5)
  components/          ui/, charts/, maps/, twin/, voice/, layout/
  lib/engine/          baseline, appliances, reconcile, anomaly, forecast, tariff, recommend, greenScore, lpg, water, aggregate, carbon, ghg, explain
  lib/api/             mock async API (households, bills, reports, cases, wards, alerts, ...)
  lib/auth/            roles, demo accounts, guards
  data/                seed generators + static catalogues (appliances, barcodes, tariff, emission factors, geo)
  stores/              zustand stores (session, citizen, supervisor, gov, notifications, twin)
  types/               shared TS types (Section 7)
docs/spec/             the six flow documents
```

---

## 4. Roles, auth and demo accounts

`/auth` shows three role cards with guidance text, then a login form, then a **demo 2FA OTP step** (code `123456`), then the role home. Sessions persist. Route guards per role. A header menu lets the presenter **switch demo account** instantly.

Role card copy:

- **Citizen** — "Digitise your home, understand your electricity, water and LPG, and earn your Green Score."
- **Area Supervisor (Councillor)** — "Monitor your ward, review AI-grouped alerts, verify on the ground and coordinate with departments."
- **Government Department** — "City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas."

| Role | Login | Password | OTP | Scope |
|---|---|---|---|---|
| Citizen (primary demo) | `citizen@savera.demo` / `9000000001` | `savera` | `123456` | Household H-1024, XYZ Colony, Ward 24 |
| Citizen (abnormal LPG demo) | `citizen2@savera.demo` | `savera` | `123456` | Household H-1088, ABC Colony, Ward 24 |
| Supervisor | `supervisor@savera.demo` | `savera` | `123456` | Ward 24 (XYZ, ABC, DEF, GHI Colony) |
| Govt — Electricity Dept | `electricity@savera.demo` | `savera` | `123456` | City of Raichur |
| Govt — Water Supply Board | `water@savera.demo` | `savera` | `123456` | City of Raichur |
| Govt — LPG Distribution Cell | `gas@savera.demo` | `savera` | `123456` | City of Raichur |

Field assistants do not get a separate login (optional stretch: `/field` mobile route). Their live updates are driven by a **"Simulate field update"** control visible in demo mode on the supervisor's case screen.

---

## 5. Route map

```
/                                   Landing page (3D hero, what SAVERA does, impact, CTA "Initialize SAVERA")
/auth                               Role cards → login → OTP

/citizen                            Home Setup hub ("Digitize Your Habitat") + Setup Completeness score
/citizen/setup/household            Basic household details
/citizen/setup/electricity          Appliance checklist → appliance details wizard → bills → baseline created
/citizen/setup/water                Map usage points, area, supply schedule, regional scarcity impact
/citizen/setup/gas                  LPG vs piped gas, cylinder size, provider, first cylinder
/citizen/electricity                Dashboard (tabs: Overview · This vs Last Month · Appliances · Forecast · Monthly Report · Recommendations)
/citizen/water                      Water Portal Home → supply details → experience → issue details → submit
/citizen/water/reports/[id]         My Report / status timeline
/citizen/water/area                 Area Water Status
/citizen/gas                        LPG Dashboard (current cylinder, usage, AI insight, refill prediction)
/citizen/gas/cylinder               Add new cylinder / mark finished
/citizen/gas/history                Usage history
/citizen/carbon                     Carbon Footprint Analyzer (New)
/citizen/green-score                Green Score breakdown
/citizen/leaderboard                Leaderboard + privacy toggle
/citizen/progress                   Rank movement over time
/citizen/twin                       My Home — Digital Twin Prototype (Simulation)
/citizen/scan                       Smart Appliance Scan & auto-onboarding
/citizen/connect                    Consent-based data integration (simulated)
/citizen/services                   Utility Services Hub (bills, payments, LPG booking — simulated)
/citizen/notifications

/supervisor                         Three boxes: Electricity · Water · Gas (ward pre-assigned)
/supervisor/electricity             Grid ops dashboard + Ward 24 household aggregate + area heatmap + DR events
/supervisor/water                   Dashboard + AI Water Supply Alerts
/supervisor/water/areas/[areaId]    Area Water Report
/supervisor/water/cases/[caseId]    Verification decision → assign → live verification → field report → validation → forward
/supervisor/water/verified          Verified Reports & Department Updates
/supervisor/gas                     Dashboard → ward overview → heatmap → area details → AI alerts → forecast → planning → reports
/supervisor/gas/areas/[areaId]
/supervisor/twin                    Ward simulation
/supervisor/notifications

/gov                                Department landing (account picks default department)
/gov/electricity                    City grid dashboard + ADR events + disruption alert publisher
/gov/water                          City Water Dashboard
/gov/gas                            City LPG Dashboard
/gov/heatmap                        Resource Heatmap (Water / LPG / Electricity layers)
/gov/wards                          Ward & Area Comparison + drill-down
/gov/forecast                       AI Demand Forecast
/gov/planning                       Resource Planning
/gov/analytics                      City Analytics & Reports
/gov/green-score                    City Green Score distribution
/gov/cases                          Verified cases forwarded by supervisors → record department action
/gov/alerts                         Publish official disruption alerts
/gov/industrial                     Industrial Environmental Intelligence (emissions map + GHG accounting)
/gov/twin                           City simulation
/gov/notifications
```

Global on every portal: floating **voice assistant** button, notifications drawer, role switcher, "Reset demo data", theme toggle.

---

## 6. Screen inventory

Each screen below lists what must be present. Full wording and sample values are in `docs/spec/`.

### 6.1 Landing `/`
Dark, premium, civic-tech aesthetic. Sections: hero with animated 3D model (stylised house/city block with flowing electricity, water and gas particle streams) and the positioning statement; "What SAVERA does" (three streams); "The loop" (measure → analyse → predict → recommend → act → learn); the three portals; the Connected Layer; impact stats (clearly labelled estimated/illustrative); CTA **Initialize SAVERA** → `/auth`.

### 6.2 Citizen — Home Setup hub `/citizen`
Heading **Digitize Your Habitat**. Subtext: "Select a utility stream to configure. Our AI requires context to map your historical consumption accurately." Four cards, exact copy:
- **Electricity Setup** — Configure high-load appliances and scan power bills.
- **Water Setup** — Map usage points and calculate regional scarcity impact.
- **Gas & Heating** — Track LPG cylinders or piped municipal gas usage.
- **Carbon Footprint Analyzer** `New` — Go beyond basic utilities. Map your commuting, diet, and lifestyle to calculate your complete environmental impact and receive actionable ESG optimization strategies.

Plus a **Home Energy Profile — NN% Complete** card with a section-by-section status table (✅ Complete · ⚠️ Partial · ⏳ Set up later · ❌ Not added) and "Complete your profile to improve appliance-level estimates." Never gates anything.

### 6.3 Citizen — Household details `/citizen/setup/household`
Name, mobile, location/PIN, ward/area, electricity provider, consumer category, number of people, home type/size, renewable energy opted (none / rooftop solar / solar water heater). All skippable. → Continue to Home Energy Setup.

### 6.4 Citizen — Electricity setup `/citizen/setup/electricity`
1. **Appliance checklist** grouped: Cooling, Fans & Ventilation, Lighting, Kitchen, Water & Heating, Laundry, Entertainment, Computing & Electronics, Other (full list in spec 02).
2. **Progressive appliance details** — only relevant questions per appliance (AC: type, tonnage, star rating, inverter, age, hours/day, count; fridge: type, capacity, star, age, count; fan: type, wattage, count, hours; washing machine: type, capacity, loads/week, count; etc.). Every question has *Don't know*, *Skip for now*, *Set up later*. Unknown → "No problem. SAVERA can estimate it using appliance characteristics and your consumption history."
3. **Status checklist** per appliance.
4. **Connect Your Electricity History** — upload current bill (PDF/image, simulated extraction: kWh, billing period, bill date, meter readings, consumer category, tariff) or enter manually (units, period).
5. **Previous bills** — "Upload your previous electricity bills to improve your baseline." Multi-upload for last 1/2/3/6/12 months; "Continue with available data"; "Skip — build baseline from current data".
6. **Baseline created** — shows Default Baseline range, confidence, what would raise it. Offer **Scan an appliance** shortcut (`/citizen/scan`).

### 6.5 Citizen — Electricity dashboard `/citizen/electricity`
- **Overview:** current month kWh, baseline band, status (Normal / ⚠️ Above normal / Significantly above), confidence chip, next-month forecast range, estimated next bill range, top recommendation, completeness nudge.
- **This vs Last Month:** previous vs current (350 → 390 kWh, +40 / +11.4%), possible contributors list (AC usage, cooling demand, operating hours, new appliance, occupancy, efficiency) — worded as possibilities.
- **Appliances:** appliance-level table (Aug/Sep/Change) + "What changed?" → largest estimated contributor; **Meter Reconciliation** card: actual 390, estimated appliance contribution 365, unallocated 25; estimates labelled and confidence shown.
- **Forecast:** next month kWh range (405–430), "Why" drivers, expected % change, **Financial forecast** (previous ₹2,850, current ₹3,120, next ₹3,250–3,500) with disclaimer "Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components."
- **Monthly Report:** auto-generated report card per spec 02 §16, downloadable as PDF (stretch) / printable.
- **Recommendations:** "Your biggest opportunity" → action → expected impact (kWh and ₹ ranges), apply-to-twin button.
- Seasonal baseline visualisation once ≥6 bills (Summer / Winter / Normal bands).

### 6.6 Citizen — Water `/citizen/water`
Home (today's planned supply card: XYZ Colony · 7:00–8:00 AM · Planned litres; current status; Quick **Report Water Issue**) → Supply Details → **Water Experience** ("How was today's water supply?" Sufficient · Less than usual · Very low · No water · Low pressure · Short duration) → Issue Details (what happened, duration received, requirement satisfied?, optional photo/video) → Report Submitted (Report ID, time, issue, status) → My Report status timeline (Submitted → AI Area Analysis → Supervisor Review → Field Verification → Department Action) → Area Water Status (overall status, aggregated reports, concern detected?, latest verified update) → Notifications.

### 6.7 Citizen — LPG `/citizen/gas`
Dashboard (current cylinder 14.2 kg, started, days used, estimated remaining days, average consumption, next expected refill; CTA **Update Cylinder**) → Add New Cylinder (size, refill date, start date, provider) / Mark Finished (finish date) → My LPG Usage (0.57 kg/day, current 18 days, previous 25, typical 25 days/cylinder, chart of cycles) → AI Consumption Insight (typical ~0.55–0.60 kg/day; ⚠️ Higher consumption detected; possible reasons incl. "Possible leakage — check for safety") → Conservation & Safety Guidance → Refill Prediction (date, basis, **Set Reminder**, **Book Refill (simulated)**) → Usage History table → Notifications.

### 6.8 Citizen — Carbon Footprint Analyzer `/citizen/carbon`
Inputs: commuting (mode, km/week), diet (category), lifestyle (flights/yr, shopping intensity), plus auto-pulled electricity/LPG/water. Output: annual tCO₂e estimate, breakdown donut, comparison to city/area average, ranked "ESG optimisation strategies" with estimated reduction each. Labelled estimated; emission factors visible in an "How this is calculated" panel.

### 6.9 Citizen — Green Score, Leaderboard, Progress
- **Green Score** (e.g. 86/100): electricity / water / LPG efficiency, improvement from personal baseline, consistency, with the normalisation explained.
- **Leaderboard:** top households (🥇 Green Home #1 — 94 …), Your Rank #127 / 700, total participants, toggle "Show my display name publicly".
- **Progress:** Last month #127 → This month #84 → Improved by 43 positions; monthly line. Badges/certificates are **not** built (listed as future extension in README).

### 6.10 Citizen — Connected features
- **Digital Twin `/citizen/twin`:** isometric "My Home" with AC, fan, lights, fridge, geyser, TV. Toggling/adjusting (AC 24 °C → 26 °C) visibly changes device state, power (kW), projected monthly kWh and ₹, and a "potential saving" readout. Header badge: *Simulation — Digital Twin Prototype*. Recommendations can be "applied" here.
- **Voice** (global): see Section 9.2.
- **Scan `/citizen/scan`:** camera or manual code → catalogue lookup (brand, model, BEE star, rated W) → years in use, hours/day, days/month → appliance added with High detail and estimated monthly contribution shown.
- **Connect `/citizen/connect`:** cards for Electricity Board, Water Board, LPG Provider, Municipal Records → "What will be shared" consent sheet → OTP → import → review → confirm → profile auto-filled. Badge: *Integration-ready · Simulated data*.
- **Services `/citizen/services`:** electricity/water bills with due dates and *Pay (simulated)* → receipt with transaction id; LPG refill prediction → *Book Refill (simulated)* → booking status timeline; reminders list.

### 6.11 Supervisor — Home `/supervisor`
Header shows assigned ward. Three boxes: Electricity · Water · Gas.

### 6.12 Supervisor — Electricity `/supervisor/electricity`
Two stacked views in one page (tabs):
- **Grid Operations** (exact values): KPI cards — Active Smart Meters 45,230 (Network Uptime 99.9%), Peak Demand (Raichur) 842 MW (+12% from average), Load Shedding 14.2 MW (Averted via Smart DR), Alerts Dispatched 1,247 (Last 24 Hours). Regional Sensor Matrix — North Sub-Station 70% MODERATE (orange), South Sector 45% STABLE (green), Industrial Zone 60% STABLE (green), Rural Feeder A 30% OPTIMAL (cyan). Aggregate Grid Demand live area chart (LIVE FEED, ~842 MW, ticks every few seconds). Live Incidents — CRITICAL Transformer Overload · Sector 4 · Just now; WARNING Frequency Drop · Grid Feed Alpha · 1h ago. **Command Terminal** with tabs Push Broadcast / City Portal Update, broadcast type dropdown (Standard Advisory (Push) …), message box placeholder "E.g. Power Command reports issue in Sector 4…", Send → creates a citizen notification for the selected areas.
- **Ward 24 Households:** total, active, current vs previous consumption, change, average household consumption, count of above-baseline households, current estimated demand, next-month predicted demand; **area heatmap** (map + list) 🟢 Normal · 🟡 Higher than baseline · 🔴 Abnormally high. Area baseline = average of complete households in that area for the same month band. Active DR events panel.

### 6.13 Supervisor — Water (8 screens)
Dashboard (KPIs: Assigned Areas 12, Active Water Concerns 5, Pending Verification 3, Field Teams Available 6, Reports Verified Today 8; area table XYZ 🔴 78 Pending, ABC 🟡 34 In Progress, DEF 🟢 12 Verified, GHI 🔴 56 Pending) → **AI Water Supply Alerts** (grouped cases, e.g. 🔴 HIGH XYZ Colony · 78 households · planned 7–8 AM · availability significantly below expected · frequency high · historical below normal · AI assessment: possible supply-demand gap · field verification required) → **Area Water Report** (planned supply, citizen feedback split 61/11/6, historical comparison, AI analysis text) → **Verification Decision** (Assign Field Verification / Mark for Monitoring / Request More Information) → **Assign Field Assistant** (Ravi Kumar, Arif Khan, Suresh M, Team 04; 8-item checklist) → **Live Field Verification** (GPS active, availability, start/end time, pressure, affected streets, evidence; demo button *Simulate field update* advances it) → **Field Verification Report** (observed 7:12–7:42 AM, 30 min, low pressure, streets A/B/C) → **Supervisor Validation** (Confirm / Reject / Needs Further Verification → Forward to Water Department) → **Verified Reports & Department Updates** (table + department response: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM. 🟢 Action Scheduled").

### 6.14 Supervisor — LPG (9 screens)
Dashboard (assigned wards, total LPG households, active, consumed this month, average, abnormal-consumption households, current and predicted demand) → Ward/Area Overview → Consumption Heatmap (Area A Normal, B High, C Normal, D Abnormally High; click to investigate) → Area Consumption Details → AI Alerts (⚠️ High LPG Consumption — Area B, current vs baseline, % change, households affected, trend) → Demand Forecast (Jan 58,000 · Feb 61,000 · Mar 63,000 kg → Apr ~66,000 kg + cylinder requirement) → LPG Requirement Planning (Area B current 4,300 → predicted 4,650 → recommended 4,650 cylinders; aggregate Area → Ward → City) → Reports & Trends → Notifications.

### 6.15 Government — City portal
Department landing shows the three departments; the logged-in account's department is highlighted, others remain viewable (single city dashboard is shared).
- **City Dashboard:** KPI groups — 🏠 Participating Households (total, active, participation rate) · 💧 Water (current, historical, forecast demand, high-demand areas) · 🔥 LPG (consumption, demand, forecast, cylinder requirement) · ⚡ Electricity (city demand, DR events, active disruptions) · 🌱 Sustainability (Green Score distribution, improvement trend). Drill-down City → Zones → Wards → Areas.
- **Water Management:** current 11.8M L, historical 10.9M L, forecast 12.4M L; high-demand areas 🔴 Ward 24 · 🟡 Ward 18 · 🟢 Ward 11; area-wise comparison; supply requirement.
- **LPG Management:** current 56,000 kg, predicted 60,000 kg, cylinder requirement; Jan 50k · Feb 53k · Mar 56k · Apr 58k → May ~60k; drill-down.
- **Electricity Management:** city-scale version of the grid ops view + **ADR** (create DR event: window, target MW, areas; see opt-in households, flexible vs protected loads, simulated averted MW) + disruption publisher link.
- **Resource Heatmap:** map with switchable layers (Water: 🟢 Normal / 🟡 Higher than baseline / 🔴 Significantly higher; LPG: 🟢 Normal / 🟡 Increasing / 🔴 High increase; Electricity: load status).
- **Ward & Area Comparison:** table (Ward 24 High / Increasing 🔴; 18 Normal / Normal 🟢; 11 High / Normal 🟡; 07 Normal / Increasing 🟡) → area drill-down, never individual citizens.
- **AI Demand Forecast:** one screen, per stream, with confidence and "based on N months of representative data" caveat.
- **Resource Planning:** water (requirement, current, forecast, high-demand areas) and LPG (demand, forecast, cylinders); note "planning information — operational decisions remain with the department".
- **City Analytics & Reports:** water daily/monthly, MoM change, area trends; LPG monthly, demand change, zones, cylinders; participation stats; export CSV.
- **City Green Score:** average 78/100 and histogram (80–100 / 60–79 / 40–59 / <40), aggregated only.
- **Cases:** forwarded verified reports → department records action (type, schedule, new planned supply) → status → citizen + supervisor notified.
- **Official Alerts:** publish planned power interruption / water supply disruption / LPG distribution advisory (type, areas, window, reason) → targeted notifications → status updates → resolve.
- **Industrial Environmental Intelligence:** map of ~8 industrial units (🟢 Within applicable limit / 🟡 Elevated / 🔴 Exceedance) with PM, SO₂, NOx, last update; separate **GHG Accounting** tab: activity data × emission factors → CO₂e inventory, scope split, trend, reduction opportunities. Both labelled simulated feeds / accounting prototype.
- **City Twin:** zones → wards → areas coloured by demand movement; click to drill.
- **Alerts & Notifications:** e.g. "Water demand higher than historical baseline in Ward 24", "LPG demand increasing across Zone 3", "Forecasted water requirement increased", "Estimated LPG requirement updated".

---

## 7. Data model (define in `src/types/`)

Core entities (fields indicative — extend as needed, keep everything typed):

- `User { id, role: 'citizen'|'supervisor'|'gov', department?, householdId?, wardId?, displayNamePublic }`
- `Geo`: `Zone { id, name, wardIds, polygon }`, `Ward { id, number, name, zoneId, areaIds, polygon }`, `Area { id, name, wardId, householdCount, polygon, centroid }`
- `Household { id, areaId, people, homeType, renewable, providerId, consumerCategory, completeness, confidence }`
- `Appliance { id, householdId, type, category, spec: Partial<ApplianceSpec>, count, hoursPerDay, daysPerMonth, ageYears, setupStatus: 'complete'|'partial'|'later'|'none', source: 'manual'|'scan'|'import' }`
- `ApplianceCatalogueEntry { type, defaultWatts, model: 'duty'|'continuous'|'per-cycle', questions[] }`, `BarcodeEntry { code, brand, model, type, star, ratedWatts }`
- `ElectricityBill { id, householdId, periodStart, periodEnd, billDate, kwh, amount?, meterPrev?, meterCurr?, source: 'upload'|'manual'|'import' }`
- `MonthlyEnergyProfile { householdId, month, actualKwh, applianceEstimates[], unallocatedKwh, baseline, status, confidence, momDelta, contributors[] }`
- `Baseline { kind: 'default'|'personalized'|'seasonal', low, high, season?, confidence, inputs[] }`
- `Forecast { month, low, point, high, drivers[], expectedChangePct, billLow, billHigh, confidence }`
- `Recommendation { id, applianceType, action, kwhSavingLow, kwhSavingHigh, rupeeLow, rupeeHigh }`
- `WaterSupplySchedule { areaId, start, end, plannedLitres, frequency }`, `WaterReport { id, householdId, areaId, date, experience, issueType, durationMin?, satisfied?, media?, status }`, `WaterCase { id, areaId, severity, reportCount, breakdown, historicalComparison, aiAssessment, state, assignment?, verification?, validation?, departmentAction? }`, `FieldVerification { assistant, checklist, observations, evidence, timeline }`, `DepartmentAction { caseId, action, newSchedule?, status, updatedAt }`
- `LpgCylinder { id, householdId, sizeKg, refillDate, startDate, finishDate?, provider }`, `LpgProfile { householdId, typicalKgPerDay, currentKgPerDay, status, refillPrediction }`
- `AreaAggregate { areaId, stream, month, totalConsumption, activeHouseholds, avgPerHousehold, baseline, status, demand, forecast }` (same shape rolled up to ward/zone/city)
- `GreenScore { householdId, month, total, efficiency:{electricity?,water?,lpg?}, improvement, consistency, rank, participants }`
- `Notification { id, audience, role, areaIds?, type, title, body, createdAt, read }`
- `OfficialAlert { id, stream, type, areaIds, window, reason, status, publishedBy }`
- `DrEvent { id, window, targetMw, areaIds, optedInHouseholds, avertedMw, status }`
- `IndustrialUnit { id, name, location, readings:{pm,so2,nox}, thresholds, status, lastUpdate }`, `GhgInventory { unitId, period, activity, factors, co2e, scopes }`
- `CarbonProfile { householdId, commute, diet, lifestyle, tco2e, breakdown, strategies[] }`
- `ConsentGrant { source, fields, grantedAt, status }`, `ServiceTransaction { kind: 'payment'|'booking'|'reminder', ref, status, simulated: true }`

---

## 8. AI engine — deterministic specifications (`src/lib/engine/`)

Every function is pure, typed and unit-tested. Calibrate defaults so the seeded demo household lands on the spec's example numbers (AC 155, fans 70, fridge 46, lighting 29, TV 20, other 50, unallocated 20–25 kWh).

**8.1 Appliance estimation.** Catalogue-driven, not constant-wattage. Duty appliances (AC, fan, geyser, TV, lights, etc.): `kW × dutyFactor × hours/day × days × count`. AC: base kW by tonnage (1 T ≈ 1.0, 1.5 T ≈ 1.5, 2 T ≈ 1.9), duty 0.55 inverter / 0.75 non-inverter, star multiplier (5★ 0.85 · 4★ 0.92 · 3★ 1.0 · ≤2★/unknown 1.10), +2 %/yr beyond 5 years. Continuous appliances (fridge, router): kWh/month by size × star. Per-cycle (washing machine, dishwasher): kWh/cycle × cycles. Unknown fields fall back to catalogue defaults and lower confidence.

**8.2 Baselines.** *Default:* blend of appliance estimate (30 %), area average for household-size band (20 %) and the available bill (50 %; if none, redistribute) → range ±12 %. *Personalised:* with ≥3 bills, mean ± 1 SD of the last 6 non-anomalous months. *Seasonal:* with ≥6 bills, separate bands for Summer (Mar–Jun), Normal (Jul–Oct), Winter (Nov–Feb). Seasonal increases are compared to the seasonal band, never flagged blindly.

**8.3 Confidence.** High = ≥6 bills and ≥80 % appliance detail; Medium = 2–5 bills or ≥50 % detail; Low = 1 bill or <50 %. Shown on every derived figure.

**8.4 Meter reconciliation.** `unallocated = actual − Σ estimates`; if negative, scale estimates proportionally and note "estimates scaled to meter reading". Estimates never presented as measurements.

**8.5 Month-on-month.** Delta, %, appliance deltas ranked, "largest estimated contributor", plus rule-based possible contributors (season change, new appliance, hours change, occupancy change, efficiency). Possibilities, not causes.

**8.6 Anomaly.** current > baseline.high × 1.15 → ⚠️ Above normal; > × 1.35 → Significantly above; < baseline.low × 0.85 → Below normal. Always attach possible contributors including "possible electrical issue — further inspection may be required".

**8.7 Forecast.** `point = (0.5 × current + 0.3 × mean(last 3) + 0.2 × sameMonthLastYear || baselineMid) × seasonalFactor(next) × (1 + areaTrend)`; range ±4 % High / ±7 % Medium / ±10 % Low. Drivers generated from which terms moved the point.

**8.8 Bill forecast.** Configurable demo slab tariff in `data/tariff.ts` (e.g. 0–50 / 51–100 / 101–200 / >200 units at rising ₹/unit, fixed charge, tax %), labelled "Demo tariff — configurable". Range = tariff(kWh low/high). Disclaimer as in 6.5.

**8.9 Recommendations.** Rule table keyed by top contributor: action → kWh saving (hours × kW × days, as a range) → ₹ via marginal slab. Always "may reduce", never guaranteed.

**8.10 Green Score (0–100).** *Efficiency per stream:* household consumption normalised per person and home-type, compared to peers in the same ward with the same size band → 0–100 (median = 60, better than 90 % of peers = 95). *Improvement:* % change vs personal baseline midpoint, mapped −20 %…+20 % → 100…20. *Consistency:* share of last 6 months at or below baseline high. Weights: Efficiency 50 % (split evenly across tracked streams), Improvement 30 %, Consistency 20 %; renormalise if a stream isn't tracked. Absolute lowest consumers do not automatically win. Leaderboard ranks within ward; seed 700 participants with the demo household at #127 last month → #84 this month.

**8.11 LPG.** `kgPerDay = sizeKg / days`; typical = median of finished cylinders; abnormal when the current projected rate exceeds typical × 1.2 after ≥5 elapsed days; refill date = start + size ÷ rate (blend current and typical). Guidance list on abnormal; "possible leakage — check for safety", never "leak detected".

**8.12 Water case grouping.** Reports in the same area and supply window form a case when ≥10 reports or ≥5 % of households. Severity: High if >30 % of respondents report insufficient/no water, Moderate if 10–30 %, else Normal. AI assessment text: "Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area's planned supply and historical pattern." State machine: `detected → under_review → verification_assigned → verification_in_progress → verified | not_confirmed | needs_more → forwarded → action_scheduled → resolved`.

**8.13 Aggregation & heatmaps.** Sum/average household data → area → ward → zone → city (anonymised; no household ids leave the aggregation module). Status vs area historical baseline: 🟢 ≤ +5 %, 🟡 +5–15 %, 🔴 > +15 % (LPG labels: Normal / Increasing / High increase). Demand forecast = linear trend of last 3–4 months × seasonal factor; cylinder requirement = `kg ÷ 14.2 × 1.05`, rounded.

**8.14 Carbon footprint.** `data/emissionFactors.ts` with commented sources: grid electricity (kgCO₂/kWh), LPG (≈2.98 kgCO₂/kg), commute per km by mode, diet categories, flights. Output tCO₂e/yr, breakdown, strategies ranked by estimated reduction.

**8.15 GHG accounting (industrial).** Activity data (fuel, electricity, process) × factors → CO₂e by scope, monthly trend, opportunities. Emission-map status from readings vs configured thresholds: Within applicable limit / Elevated / Exceedance.

**8.16 Explanations.** All "why" text from templates in `engine/explain.ts`. `ExplanationProvider` interface with `RuleBasedProvider` default; `AnthropicProvider` only rephrases existing template output when a key exists.

---

## 9. Connected Resource Layer

**9.1 Digital Twin / Simulation.** Shared r3f scene primitives; three scenes: citizen home (appliances with state, kW, temperature), supervisor ward (area blocks coloured by status, click → area page), city (zones/wards). Simulation state lives in `stores/twin`; changing a device updates estimated kWh/₹ via the engine in real time. Always titled *Simulation / Digital Twin Prototype*. Stretch: a `DeviceAdapter` interface with a `SimulatedAdapter` implementation and a documented stub for Matter-compatible devices.

**9.2 Voice assistant.** Floating mic on every portal; transcript panel; spoken + text answers; intents matched by keyword table (`lib/voice/intents.ts`), scoped by role. Minimum intents:

| Role | Utterances → action |
|---|---|
| Citizen | "which appliance is consuming the most", "how much electricity did I use this month", "how can I reduce my water consumption", "when will my LPG cylinder finish", "show today's water supply", "what's my green score", "turn off the simulated AC", "set AC to 26 degrees" (applies to twin) |
| Supervisor | "show high-consumption areas in ward 24", "show pending field verifications", "summarise today's water complaints", "open the XYZ Colony case" |
| Government | "show wards where water demand is above baseline", "what is next month's LPG requirement", "open the resource heatmap", "publish a power interruption alert for ward 24" (opens prefilled form, does not publish) |

Unrecognised → "I can help with…" list. Works with text input when the browser lacks speech APIs.

**9.3 Smart Appliance Scan.** `data/barcodes.ts` with ~15 codes (ACs, fridges, washing machines, geysers, TVs; brands generic or fictional). Flow: scan/enter → specs → years in use, hours/day, days/month → estimate → compare with baseline → efficiency/replacement insight. Position as "onboarding accelerator", not an efficiency detector.

**9.4 Consent-based data integration.** Simulated "API Setu-style" flow per 6.10. Show exactly which fields will be imported; store `ConsentGrant`; imported fields tagged `source: 'import'` and shown with a badge; user can revoke.

**9.5 Utility Services Hub.** Simulated payments (receipt with reference, marked simulated) and simulated LPG booking (status timeline: Requested → Confirmed → Out for delivery → Delivered, advanced by a demo control). Reminders create notifications.

**9.6 Automated Demand Response (electricity only).** Gov creates `DrEvent` → opted-in citizens get an event card listing flexible loads (AC, EV charger, geyser) vs protected (fridge, medical) → Approve / Auto → twin shows reduced load → gov KPI "Load Shedding Averted via Smart DR" increments. Copy: "SAVERA can orchestrate configured, non-critical loads during demand-response events through compatible connected devices and authorised utility signals." Never "switches off everyone's appliances".

**9.7 Official Resource Disruption Alerts.** Publisher in `/gov/alerts`; targeted by area; citizens and supervisors in those areas get notifications and a banner on the relevant stream dashboard; status updates and resolution close it.

**9.8 Unified Issue & Resolution Workflow.** The water case pipeline (8.12) is the reference implementation; LPG and electricity issues reuse the same `Case` components with stream-specific fields. Citizen always receives the closing notification.

---

## 10. Design direction

- **Landing:** dark, cinematic, "civic-tech meets energy". Gradient background, 3D hero, generous whitespace, strong type hierarchy, subtle particle motion. Must run at 60 fps on a laptop; provide reduced-motion respect.
- **App:** clean dashboard aesthetic, light + dark themes, shadcn components, cards with clear headers, consistent 8-pt spacing.
- **Status palette (use everywhere):** Optimal = cyan, Normal/Stable = green, Moderate/Higher-than-baseline = amber, Critical/Abnormal = red, Unknown = grey. Never rely on colour alone — pair with a label/icon.
- **Chips:** `Estimated · Medium confidence`, `Simulated`, `Integration-ready`, `Simulation`, `Official`.
- Citizen screens mobile-first (375 px) and touch-friendly; supervisor/gov desktop-first (1280 px+) but usable on tablet.
- Skeleton loaders, empty states with a next action, toasts for every write, keyboard accessible, proper labels and contrast.
- Numbers formatted for India (₹3,120; 1,00,000 L where lakhs read naturally; 14.2 kg).

---

## 11. Seed data requirements (`src/data/seed/`)

Deterministic (fixed seed), relative to today's date (months roll forward automatically). Spec numbers are illustrative anchors — match them for the demo entities.

- **Geography:** Raichur city; 3 zones; 8 wards including Ward 24, 18, 11, 07; Ward 24 has XYZ, ABC, DEF, GHI Colony; other wards 3–4 areas each. Approximate GeoJSON polygons around Raichur (16.20 N, 77.35 E).
- **Households:** ~5,000 city-wide as aggregate counts; ~700 participants in Ward 24 for the leaderboard; ~80 concrete household records (for peers, heatmaps and abnormal examples).
- **H-1024 (primary citizen):** 4 people, 2BHK apartment, no renewable; appliances: 1×1.5 T 3★ non-inverter AC (4 yrs, 6 h/day), fridge 260 L 3★, 4 ceiling fans, 8 LED + 2 tube lights, TV, geyser (set up later), washing machine (partial), microwave, mixer, router, laptop, iron; 12 months of bills with seasonality; last month 350 kWh / ₹2,850, current 390 kWh / ₹3,120; baseline 320–350; forecast 405–430 kWh, ₹3,250–3,500; completeness 78 %, confidence Medium. LPG: cylinders Aug 1–26 (25 d), Aug 27–Sep 21 (25 d), current from Sep 22, 18 days used, 0.57 kg/day, typical 0.55–0.60. Water: XYZ Colony, 7:00–8:00 AM daily, planned 4,50,000 L for the colony. Green Score 86, rank #127 → #84.
- **H-1088 (second citizen):** abnormal LPG cycle (>1.2× typical) to demo the alert + safety guidance.
- **Ward 24 water:** XYZ 78 reports (61 insufficient / 11 low pressure / 6 short duration), ABC 34, DEF 12, GHI 56; field assistants Ravi Kumar, Arif Khan, Suresh M, Team 04; one case pre-seeded at each pipeline state.
- **LPG (ward/area):** Areas A–D statuses; monthly 58,000 / 61,000 / 63,000 kg → forecast ~66,000; Area B 4,300 → 4,650 cylinders.
- **City:** water 11.8M / 10.9M / 12.4M L; LPG 56,000 → 60,000 kg with the 4-month history; Green Score average 78 with distribution; ward comparison table as in 6.15.
- **Electricity grid:** all values in 6.12; live demand series generated around 842 MW; 3 DR events (1 active); 2 disruption alerts (1 active).
- **Industrial:** 8 units with readings and thresholds; 6 months of GHG activity data each.
- **Notifications:** 5–8 seeded per role, plus everything generated by demo actions.

---

## 12. Build order and acceptance criteria

**Phase 0 — Foundation.** Scaffold, tooling, `CLAUDE.md`, `DECISIONS.md`, design tokens and status palette, layout shells for the three portals, role guard, mock API layer, seed generator, engine skeleton with tests for 8.1–8.13, all routes created with real shells wired to seed data.
*Done when:* `npm run dev` boots, typecheck/lint/tests pass, every route in Section 5 renders without console errors.

**Phase 1 — Landing + Auth.** 3D hero, all landing sections, `/auth` role cards → login → OTP, role switcher, notifications drawer shell, reset demo data.

**Phase 2 — Citizen Electricity end-to-end.** Home Setup hub, household details, checklist, progressive wizard with skip/later, status checklist, bills (simulated OCR + manual + previous bills), baseline, full dashboard (all six tabs), monthly report, completeness score, confidence chips.
*Done when:* the H-1024 story (350 → 390, AC +35, unallocated 25, forecast 405–430, ₹3,250–3,500, recommendation) is visible end-to-end.

**Phase 3 — Water pipeline across all three portals.** Citizen water screens; supervisor 8 screens with the case state machine and demo controls (*Simulate field update*, *Simulate department action*); gov `/gov/water` and `/gov/cases`; citizen status timeline and notifications update live.
*Done when:* a new citizen report can be filed, grouped into the XYZ case, assigned, verified, validated, forwarded, actioned and the citizen notified — in one sitting.

**Phase 4 — LPG across all three portals.** Citizen LPG (add/finish cylinder, insight, safety guidance, refill prediction, history), supervisor 9 screens, gov `/gov/gas`.

**Phase 5 — Green Score, Leaderboard, Progress, Carbon Analyzer.** Engine 8.10 and 8.14, privacy toggle, city Green Score screen.

**Phase 6 — Electricity for Supervisor and Government.** Grid ops dashboard with live chart and command terminal, Ward 24 aggregate + heatmap, `/gov/electricity`, ADR events, official disruption alerts (`/gov/alerts`) with targeted notifications.

**Phase 7 — Connected Layer.** Digital twin (3 scenes + 2D fallback), voice assistant with the intent table, appliance scan, consent-based integration, utility services hub, industrial environmental intelligence + GHG accounting, city twin.

**Phase 8 — Polish and demo readiness.** Heatmap/ward comparison/forecast/planning/analytics screens complete with CSV export; notifications everywhere; mobile pass on citizen screens; accessibility pass; README with setup, demo accounts and the demo script (Section 14); Playwright smoke test that walks the demo script; final `DECISIONS.md` review.

---

## 13. Definition of done

- Every route renders seeded data; zero console errors; typecheck, lint and tests green.
- The demo script (Section 14) runs end-to-end in under six minutes without a refresh.
- Every derived figure carries an `Estimated` chip and confidence; every simulated integration is labelled; no real utility, provider or standard is presented as connected.
- Supervisor and government screens contain no individual household identifiers.
- `README.md`, `CLAUDE.md` and `DECISIONS.md` are current.

---

## 14. Demo script (write into README)

1. Landing → **Initialize SAVERA** → Citizen login → OTP `123456`.
2. Home Setup hub → show completeness 78 % → Electricity dashboard: This vs Last Month → Appliances (AC +35, reconciliation) → Forecast (405–430 kWh, ₹3,250–3,500) → top recommendation → apply it in the **Digital Twin** and watch kWh/₹ drop.
3. Voice: "when will my LPG cylinder finish" → LPG dashboard → refill prediction → Book Refill (simulated).
4. Water: today's supply → "Insufficient" → submit report → status timeline at *AI Area Analysis*.
5. Switch to Supervisor → Water → XYZ Colony alert (78 households) → Area Water Report → Assign Ravi Kumar → *Simulate field update* → Field report → Confirm → Forward to Water Department.
6. Switch to Government (Water) → Cases → record "Supply adjustment scheduled, 7:00–8:15 AM" → City Water dashboard → Heatmap → Ward comparison → Forecast → Planning.
7. Switch to Government (Electricity) → grid dashboard → create DR event → publish a planned interruption for Ward 24.
8. Back to Citizen → notifications show department action, DR event and official alert → Green Score 86 → Leaderboard #84 → Progress (+43 positions).
9. Close on Government → Industrial Environmental Intelligence and City Green Score.

---

## 15. Decisions already made for you (override only with a reason in DECISIONS.md)

- **Electricity has a government module.** Spec 05 keeps electricity citizen-facing, but three department accounts are required, so `/gov/electricity` = city grid operations + ADR + disruption alerts (no household resource planning).
- **No separate field-assistant login.** Field activity is simulated from the supervisor's case screen; a `/field` mobile view is an optional stretch.
- **OCR, payments, booking, government import, IoT, emissions feeds are simulated** and labelled as such.
- **No backend or database.** Mock API layer designed for drop-in replacement; state persists in localStorage for demo continuity.
- **Badges, certificates and rewards are not built** — listed as future extensions in the README.
- **Demo tariff, emission factors and thresholds are configurable data files**, clearly labelled as demo values.
