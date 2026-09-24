# 06 — Connected Resource Layer

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

The connected layer is "simulate → integrate → control/automate *where supported*". Everything here is simulated and labelled: `Simulation`, `Simulated`, `Integration-ready`. Standards (Matter, OpenADR, API Setu, BBPS, OCEMS) are only ever "designed to integrate with". Covers: digital twin (3 scenes), voice assistant, smart appliance scan, consent-based integration, utility services hub, automated demand response, official disruption alerts, unified issue workflow.

---

## 1. Digital Twin — `/citizen/twin`, `/supervisor/twin`, `/gov/twin`

Every twin screen: PageHeader title **Simulation — Digital Twin Prototype**, chip `Simulation`, toggle **3D / 2D** (`useUiStore.twinMode`; 2D is an SVG isometric grid with the same data). Never the word "live".

### 1.1 My Home `/citizen/twin`
- Isometric house with six devices: **AC · Fan · Lights · Fridge · Geyser · TV**. Particle streams for electricity (amber), water (sky) and gas (rose).
- Device panel per device: on/off switch · power **kW** · hours/day slider · AC set-point slider (16–30 °C) · flexible / protected badge.
- Seed state: AC on 1.5 kW 24 °C 6 h · Fans on 0.3 kW 10 h · Lights on 0.1 kW 5 h · Fridge on 0.06 kW 24 h · Geyser off 2.0 kW 0.5 h · TV on 0.08 kW 4 h → projected **~365 kWh / month · ₹2,900** (`Estimated`), baseline 390 kWh.
- Readouts (update in real time via `projectTwin`): **Power now (kW)** · **Projected monthly kWh** · **Projected ₹** · **Potential saving vs current month** (kWh and ₹, green).
- Demo interaction: AC 24 °C → **26 °C** → AC duty drops, projected kWh falls ~25–35 and ₹ ~190–270; the saving readout turns green.
- **Apply recommendation** list (from `/citizen/electricity` Recommendations; `?apply=<id>` pre-applies): applying sets device state and records `appliedRecommendationIds`. Toast "Applied in simulation — projected saving 30 kWh".
- DR banner when an active DR event covers the household: "Demand-response event 6:00–8:00 PM — simulated reduced load applied" (`drReduced`).
- **Reset simulation** button.

### 1.2 Ward `/supervisor/twin`
- `WardScene`: Ward 24 area blocks (XYZ, ABC, DEF, GHI) extruded by demand and coloured by status tone for the selected stream (Electricity / Water / LPG). Click → the area page (`/supervisor/water/areas/[id]` or `/supervisor/gas/areas/[id]`). Side panel: area aggregates (households count, current vs baseline, status).

### 1.3 City `/gov/twin`
- `CityScene`: zones → wards → areas; level switch; colour by demand movement; click drills down; side panel aggregates; link to `/gov/heatmap`.

---

## 2. Voice Assistant (global)

- Floating mic button on every portal page; opens a panel with transcript, text input (fallback when the browser has no `SpeechRecognition`), and spoken (`speechSynthesis`) + text answers. Toggle "Speak answers".
- `matchIntent(text, role)` over a keyword table; role-scoped. Unrecognised → "I can help with…" list for the role.
- Every spoken figure is prefixed "Estimated" when derived.

| Role | Utterance (keywords) | Response `say` | Navigate / action |
|---|---|---|---|
| Citizen | "which appliance is consuming the most" | "Your air conditioner is the largest estimated contributor at about 155 kWh this month." | `/citizen/electricity?tab=appliances` |
| Citizen | "how much electricity did I use this month" | "You used 390 kWh this month, 40 more than last month — estimated above your baseline band." | `/citizen/electricity` |
| Citizen | "how can I reduce my water consumption" | "Fix dripping taps, run full loads, and reuse RO reject water. Your area's planned supply is 7 to 8 AM." | `/citizen/water` |
| Citizen | "when will my LPG cylinder finish" | "Your cylinder is estimated to last about 7 more days — refill around 17 October." | `/citizen/gas` |
| Citizen | "show today's water supply" | "Today's planned supply for XYZ Colony is 7 to 8 AM." | `/citizen/water` |
| Citizen | "what's my green score" | "Your Green Score is 86 out of 100, rank 84 in Ward 24." | `/citizen/green-score` |
| Citizen | "turn off the simulated AC" | "Turning off the AC in the simulation." | `/citizen/twin` + `setDevice('ac', { on: false })` |
| Citizen | "set AC to 26 degrees" | "Setting the simulated AC to 26 degrees." | `/citizen/twin` + `setDevice('ac', { setpointC: 26 })` |
| Supervisor | "show high-consumption areas in ward 24" | "Two areas are above baseline: ABC Colony and GHI Colony." | `/supervisor/gas` (heatmap) |
| Supervisor | "show pending field verifications" | "Three verifications are pending in Ward 24." | `/supervisor/water` |
| Supervisor | "summarise today's water complaints" | "180 reports today across four areas; XYZ Colony has 78 with a possible supply-demand gap." | `/supervisor/water` |
| Supervisor | "open the XYZ Colony case" | "Opening the XYZ Colony case." | `/supervisor/water/cases/case-xyz-001` |
| Government | "show wards where water demand is above baseline" | "Ward 24 is significantly above baseline; Ward 18 and Ward 11 are higher than baseline." | `/gov/wards` |
| Government | "what is next month's LPG requirement" | "Estimated next-month LPG demand is about 60,000 kg, roughly 4,440 cylinders." | `/gov/gas` |
| Government | "open the resource heatmap" | "Opening the resource heatmap." | `/gov/heatmap` |
| Government | "publish a power interruption alert for ward 24" | "I've prefilled a planned power interruption alert for Ward 24. Review and publish when ready." | `/gov/alerts?type=power&ward=ward-24` (never publishes) |

Fallback list copy, citizen: "I can help with: your biggest appliance, this month's electricity, water supply today, LPG refill, Green Score, and the home simulation."

---

## 3. Smart Appliance Scan `/citizen/scan`

Positioned as an **onboarding accelerator**, not an efficiency detector. Chip `Simulated catalogue`.

Flow:
1. **Scan** — camera view via `html5-qrcode` (permission prompt) or **Enter code manually** input. Sample codes button "Use a demo code".
2. **Lookup** → catalogue card: brand · model · type · BEE star · rated W. Not found → "Code not in the demo catalogue — add the appliance manually." → `/citizen/setup/electricity`.
3. **Usage questions:** years in use · hours/day · days/month (each with Don't know / Skip).
4. **Result:** appliance added with **High detail** (source `scan`), estimated monthly contribution (e.g. "≈ 42 kWh / month · ₹330", `Estimated · High confidence`), comparison with baseline share, insight "A 5★ inverter model of the same tonnage may reduce this by 25–35 %." (may, never guaranteed). Buttons **Add another** · **Open dashboard**.

Barcode catalogue (`data/catalogue/barcodes.ts`, ~15 entries, fictional brands):

| Code | Brand · Model | Type | Star | Rated W |
|---|---|---|---|---|
| SAV-AC-1501 | Zephyr Cool ZC-15i | AC 1.5 T inverter | 5★ | 1,450 |
| SAV-AC-1502 | Zephyr Cool ZC-15 | AC 1.5 T | 3★ | 1,800 |
| SAV-AC-1001 | NorthWind NW-10i | AC 1 T inverter | 4★ | 1,050 |
| SAV-AC-2001 | Zephyr Cool ZC-20 | AC 2 T | 3★ | 2,300 |
| SAV-RF-2601 | FrostLine FL-260D | Fridge 260 L double door | 3★ | 140 |
| SAV-RF-1901 | FrostLine FL-190S | Fridge 190 L single door | 4★ | 110 |
| SAV-RF-3401 | Polaris PX-340 | Fridge 340 L | 5★ | 150 |
| SAV-WM-0701 | AquaSpin AS-70T | Washing machine 7 kg top load | 4★ | 500 |
| SAV-WM-0801 | AquaSpin AS-80F | Washing machine 8 kg front load | 5★ | 2,000 |
| SAV-GY-0251 | HeatWave HW-25 | Geyser 25 L storage | 4★ | 2,000 |
| SAV-GY-0151 | HeatWave HW-15 | Geyser 15 L storage | 3★ | 2,000 |
| SAV-TV-4301 | Lumen View LV-43 | TV 43" LED | 4★ | 75 |
| SAV-TV-5501 | Lumen View LV-55 | TV 55" LED | 5★ | 110 |
| SAV-FN-1201 | BreezeMax BM-12 | Ceiling fan BLDC | 5★ | 32 |
| SAV-FN-1202 | BreezeMax BM-Classic | Ceiling fan | 3★ | 75 |

---

## 4. Consent-based data integration `/citizen/connect`

Badge on the page: **Integration-ready · Simulated data**. Copy: "Designed to integrate with consent-based data-sharing frameworks such as API Setu. In this prototype all data is simulated."

Four source cards: **Electricity Board** · **Water Board** · **LPG Provider** · **Municipal Records**. Each shows status: Not connected / Connected (date) / Revoked.

Flow per source:
1. **Connect** → "What will be shared" consent sheet listing exact fields:
   - Electricity Board: consumer number, consumer category, tariff, last 12 bills (kWh, amount, period).
   - Water Board: connection id, supply zone, planned schedule.
   - LPG Provider: connection id, cylinder size, last 6 refill dates.
   - Municipal Records: ward, area, PIN, property type.
2. **I consent** → OTP step (`123456`, `Demo`).
3. **Import** (1.5 s "Fetching (simulated)…") → **Review** table of imported values with per-row include checkbox.
4. **Confirm** → profile auto-filled; imported fields tagged `source: 'import'` and shown with an `Imported` badge across setup and dashboard; `ConsentGrant` stored (source, fields, grantedAt, status). Toast "Imported 12 bills from Electricity Board (simulated)".
5. **Revoke** on the card → status Revoked, imported fields keep their values but badge changes to "Imported · consent revoked"; toast.

---

## 5. Utility Services Hub `/citizen/services`

Chip `Simulated`. Copy: "Designed to integrate with bill-payment and booking services such as BBPS. Payments and bookings here are simulated."

Tabs: **Bills & Payments · LPG Booking · Reminders**.

### Bills & Payments
- Electricity bill Sep 2026 · ₹3,120 · due 8 Oct 2026 · **Pay (simulated)**. Water bill Sep 2026 · ₹420 · due 15 Oct · **Pay (simulated)**.
- Pay → 1 s processing → **Receipt** dialog: transaction id `TXN-SIM-20261010-0001` · amount · date · `Simulated payment — no money moved`. Bill marked Paid. Toast.
- Payment history table (`transactions`, kind `payment`).

### LPG Booking
- Card: refill predicted ~17 Oct 2026 · **Book Refill (simulated)** → booking `BK-2041` with status timeline **Requested → Confirmed → Out for delivery → Delivered**; demo control **Advance booking status** moves one step; each step creates a notification. Delivered offers "Add this cylinder" → `/citizen/gas/cylinder` prefilled.

### Reminders
- List from `reminders` (LPG refill 14 Oct, bill due 8 Oct). **Add reminder** (title, date, stream) → creates a reminder and a notification at creation time ("Reminder set").

---

## 6. Automated Demand Response (electricity only)

- Gov creates a `DrEvent` (spec 05 §2.2). Opted-in citizens (H-1024 seed opted in) see an **event card** on `/citizen/electricity` Overview and in notifications: "Demand-response event today 6:00–8:00 PM · Ward 24".
- Card lists **Flexible loads:** AC, EV charger, geyser · **Protected loads:** fridge, medical equipment (never touched).
- Buttons **Approve** (apply reduced load for the window) · **Auto** (allow SAVERA to apply automatically for future events) · **Decline**. Approve/Auto → `respondToDrEvent`, twin `drReduced = true`, projected kW drops; gov KPI "Load Shedding Averted via Smart DR" increments (simulated MW).
- Copy (verbatim): "SAVERA can orchestrate configured, non-critical loads during demand-response events through compatible connected devices and authorised utility signals." Chip `Integration-ready · Simulated`. Never "switches off everyone's appliances".

---

## 7. Official Resource Disruption Alerts

- Published only from `/gov/alerts` by a department account (`Official` chip). Types: planned power interruption · water supply disruption · LPG distribution advisory.
- Targeting by area/ward → notifications to citizens and supervisors in those areas; `AlertBanner` on the matching stream dashboard (`/citizen/electricity`, `/citizen/water`, `/citizen/gas`, `/supervisor/<stream>`): title, window, reason, "Official — <Department>" and status.
- Status updates append to the alert and notify again; **Resolve** closes it, removes the banner, and sends "Resolved: <title>".
- Seed: `alert-001` active water disruption Ward 18 (6:00–10:00 AM, pipeline maintenance); `alert-002` resolved power interruption Ward 07.

---

## 8. Unified Issue & Resolution Workflow

- The water case pipeline (spec 04 §7) is the reference implementation: detect → group → supervisor review → field verification → validation → forward → department action → resolve → citizen notified.
- LPG and electricity issues reuse the same `Case` components (case card, `StatusTimeline`, decision buttons, department action dialog) with stream-specific fields: LPG — area consumption vs baseline, abnormal household count; electricity — area load vs baseline, incident reference.
- The citizen always receives the closing notification (resolved or not confirmed).
- Case screens never show household ids; counts only.

---

## 9. Device adapter (stretch, documented only)

`DeviceAdapter` interface (`getState`, `setState`) with a `SimulatedAdapter` implementation used by the twin; a documented stub for Matter-compatible devices is included as commentary only. No real device is ever connected; UI copy says "designed to integrate with Matter / OpenADR-compatible devices".

---

## 10. Labels checklist for this layer

| Feature | Mandatory chip |
|---|---|
| Twin (all scenes) | `Simulation` + title "Simulation — Digital Twin Prototype" |
| Voice figures | "Estimated" spoken/written prefix on derived numbers |
| Scan | `Simulated catalogue`; estimate `Estimated · High confidence` |
| Connect | `Integration-ready · Simulated data`; imported fields `Imported` |
| Services | `Simulated` on payments, receipts and bookings |
| DR | `Integration-ready · Simulated`; averted MW "(simulated)" |
| Official alerts | `Official` + department name |
| Industrial feeds (spec 05) | `Simulated feeds` / `Accounting prototype` |
