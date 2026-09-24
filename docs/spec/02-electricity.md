# 02 — Citizen Electricity

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

Screens: `/citizen` (Home Setup hub) → `/citizen/setup/household` → `/citizen/setup/electricity` (checklist → details wizard → status checklist → bills → previous bills → baseline created) → `/citizen/electricity` (six tabs). All sample numbers are for the primary demo household **H-1024** (4 people, 2BHK apartment, XYZ Colony, Ward 24, no renewable) in the current month (month of `demoNow`, e.g. Sep 2026) against the previous month (Aug 2026).

---

## 1. Home Setup hub `/citizen`

- Heading **Digitize Your Habitat**. Subtext: "Select a utility stream to configure. Our AI requires context to map your historical consumption accurately."
- Four cards (exact copy):
  - **Electricity Setup** — Configure high-load appliances and scan power bills. → `/citizen/setup/electricity`
  - **Water Setup** — Map usage points and calculate regional scarcity impact. → `/citizen/setup/water`
  - **Gas & Heating** — Track LPG cylinders or piped municipal gas usage. → `/citizen/setup/gas`
  - **Carbon Footprint Analyzer** `New` — Go beyond basic utilities. Map your commuting, diet, and lifestyle to calculate your complete environmental impact and receive actionable ESG optimization strategies. → `/citizen/carbon`
- **Home Energy Profile — 78% Complete** card (progress bar) with the status table:

| Section | Status |
|---|---|
| Household details | ✅ Complete |
| Cooling (AC) | ✅ Complete |
| Refrigerator | ✅ Complete |
| Fans & lighting | ✅ Complete |
| Entertainment (TV) | ✅ Complete |
| Geyser | ⏳ Set up later |
| Washing machine | ⚠️ Partial |
| Kitchen (microwave, mixer) | ✅ Complete |
| Electricity bills | ✅ 12 months |
| Water setup | ✅ Complete |
| LPG setup | ✅ Complete |
| Carbon inputs | ❌ Not added |

- Footer line: "Complete your profile to improve appliance-level estimates." Buttons per incomplete row: **Complete now**. Never gates anything.
- Confidence chip: `Estimated · Medium confidence` (inputs: 12 bills, 78 % appliance detail).

---

## 2. Household details `/citizen/setup/household`

Every field has **Skip for now** and **Set up later** (via `SkipRow`). Sample values are H-1024's seed.

| Field | Control | Sample |
|---|---|---|
| Name | text | Priya Sharma |
| Mobile | tel | 9000000001 |
| Location / PIN | text | Raichur · 584101 |
| Ward / Area | select | Ward 24 · XYZ Colony |
| Electricity provider | select | Electricity Department (Raichur) |
| Consumer category | choice grid | Domestic (LT-2) · Commercial · Other |
| Number of people | stepper | 4 |
| Home type / size | choice grid | 1BHK · **2BHK** · 3BHK · Independent house · Villa; size 850 sq ft |
| Renewable energy opted | choice grid | **None** · Rooftop solar · Solar water heater |

CTA **Continue to Home Energy Setup** → `/citizen/setup/electricity`. Toast: "Household details saved."

---

## 3. Electricity setup `/citizen/setup/electricity`

Stepper: 1 Checklist · 2 Appliance details · 3 Status · 4 Current bill · 5 Previous bills · 6 Baseline.

### 3.1 Step 1 — Appliance checklist (nine categories)

Multi-select chips; a count stepper appears on selection. Pre-checked items are H-1024's seed.

- **Cooling:** Air conditioner ✔ (1) · Air cooler · Ceiling-mounted cooler · Portable AC · Dehumidifier
- **Fans & Ventilation:** Ceiling fan ✔ (4) · Table / pedestal fan · Exhaust fan · Wall fan · Tower fan
- **Lighting:** LED bulb ✔ (8) · Tube light ✔ (2) · CFL · Decorative / strip lights · Outdoor / security light
- **Kitchen:** Refrigerator ✔ (1) · Microwave ✔ (1) · Mixer / grinder ✔ (1) · Induction cooktop · Electric kettle · Toaster / OTG · Dishwasher · Chimney
- **Water & Heating:** Geyser / water heater ✔ (set up later) · Water pump / motor · Instant heater · Room heater · RO purifier
- **Laundry:** Washing machine ✔ (partial) · Dryer · Iron ✔ (1)
- **Entertainment:** Television ✔ (1) · Set-top box · Speaker / home theatre · Gaming console
- **Computing & Electronics:** Wi-Fi router ✔ (1) · Laptop ✔ (1) · Desktop PC · Printer · Mobile chargers
- **Other:** EV charger · Inverter / UPS · Sewing machine · Vacuum cleaner · Aquarium

Buttons: **Continue** · **Skip for now** · **Set up later**.

### 3.2 Step 2 — Progressive appliance details

One card per selected appliance; only the relevant questions appear. Every question row has **Don't know · Skip for now · Set up later**. Choosing *Don't know* shows: "No problem. SAVERA can estimate it using appliance characteristics and your consumption history."

| Appliance | Questions (H-1024 sample) |
|---|---|
| Air conditioner | Type (Split / Window) → Split; Tonnage (1 / 1.5 / 2 T) → 1.5 T; BEE star (1–5) → 3★; Inverter? → No; Age (yrs) → 4; Hours/day → 6; Count → 1 |
| Refrigerator | Type (Single door / Double door / Side-by-side) → Double door; Capacity (L) → 260; Star → 3★; Age → 5; Count → 1 |
| Ceiling fan | Type (Standard / BLDC) → Standard; Wattage → 75 W; Count → 4; Hours/day → 10 |
| LED bulb / Tube light | Wattage → 9 W / 36 W; Count → 8 / 2; Hours/day → 5 |
| Television | Type (LED / OLED / CRT) → LED; Screen size → 43"; Hours/day → 4; Count → 1 |
| Geyser | Type (Storage / Instant); Capacity (L); Star; Minutes/day; Count — *Set up later* |
| Washing machine | Type (Top load / Front load / Semi-auto) → Top load; Capacity (kg) → *Don't know*; Loads/week → 4; Count → 1 (Partial) |
| Microwave | Wattage → 900 W; Minutes/day → 10 |
| Mixer / grinder | Wattage → 750 W; Minutes/day → 15 |
| Wi-Fi router | Always on? → Yes |
| Laptop | Hours/day → 6; Count → 1 |
| Iron | Wattage → 1000 W; Minutes/week → 60 |

Unknown fields fall back to catalogue defaults and lower confidence for that appliance.

### 3.3 Step 3 — Status checklist

Table: Appliance · Detail level (High / Medium / Low) · Status (✅ Complete · ⚠️ Partial · ⏳ Set up later · ❌ Not added) · **Edit**. Summary line: "9 of 12 appliances complete · 78 % detail". **Continue**.

### 3.4 Step 4 — Connect Your Electricity History

- Heading **Connect Your Electricity History**. Two panels:
  - **Upload current bill** (PDF / image). Drop zone → 1.5 s "Processing bill…" → extraction card labelled `Simulated OCR`: Units 390 kWh · Billing period 22 Aug – 21 Sep 2026 · Bill date 23 Sep 2026 · Meter readings 14,210 → 14,600 · Consumer category Domestic (LT-2) · Tariff Demo tariff · Amount ₹3,120. Each field editable. **Looks right — save**.
  - **Enter manually**: Units (kWh), Period start, Period end, Amount (optional). **Save bill**.
- Toast: "Bill added — 390 kWh for Sep 2026." Measured values carry `Measured`, not `Estimated`.

### 3.5 Step 5 — Previous bills

- Copy: "Upload your previous electricity bills to improve your baseline."
- Quick pick: **Last 1 · 2 · 3 · 6 · 12 months** → multi-upload list, each row simulated-extracted (seed has 12 months with seasonality; Aug 2026 = 350 kWh / ₹2,850).
- Buttons: **Continue with available data** · **Skip — build baseline from current data**.
- Helper: "With 6+ bills SAVERA builds seasonal baselines (Summer / Normal / Winter)."

### 3.6 Step 6 — Baseline created

- Title **Your baseline is ready**. Card:
  - Kind: Personalised baseline (12 bills) — for a one-bill user: Default Baseline.
  - Range: **320–350 kWh / month** for Sep. `Estimated · Medium confidence`.
  - Inputs listed: 12 bills · appliance estimate 365 kWh · area average (4-person band) 340 kWh.
  - "What would raise confidence": complete the geyser and washing machine details; confidence → High at ≥80 % detail.
- CTAs: **Open Electricity Dashboard** · **Scan an appliance** (→ `/citizen/scan`) · **Back to Home Setup**.

---

## 4. Electricity dashboard `/citizen/electricity`

PageHeader: eyebrow `ELECTRICITY`, title **Your Electricity**, chips `Estimated · Medium confidence` and `Sep 2026`. Active official alert → `AlertBanner` above tabs. Tabs: **Overview · This vs Last Month · Appliances · Forecast · Monthly Report · Recommendations**.

### 4.1 Overview

- KPI row: **This month 390 kWh** (`Measured`, from bill) · **Baseline 320–350 kWh** (`Estimated`) · **Status ⚠️ Above normal** (amber) · **Confidence Medium**.
  - Status labels: Normal (emerald) · ⚠️ Above normal (amber) · Significantly above normal (red) · Below normal (cyan). The H-1024 demo story shows ⚠️ Above normal for 390 kWh against 320–350; the engine thresholds in master prompt §8.6 are authoritative for all other households.
- **Next month forecast:** 405–430 kWh · **Estimated next bill ₹3,250–3,500** · `Estimated · Medium confidence`.
- **Top recommendation** card: "Raise AC set-point from 24 °C to 26 °C — may reduce 25–35 kWh (₹190–270) per month." Button **See all recommendations**.
- **Completeness nudge:** "Profile 78 % complete — add geyser details to sharpen estimates." → `/citizen/setup/electricity`.
- Seasonal baseline strip (12 bills ≥ 6): Summer 380–420 · Normal 320–350 · Winter 290–320 kWh with the current month highlighted.

### 4.2 This vs Last Month

- Big compare: **Aug 350 kWh → Sep 390 kWh · +40 kWh · +11.4 %** (`DeltaPill` amber).
- Bar/line chart of the last 6 months.
- **Possible contributors** (worded as possibilities, never causes):
  - Increased AC usage (estimated +35 kWh)
  - Higher cooling demand (warmer days this period)
  - Longer appliance operating hours
  - A new appliance added this month
  - Change in occupancy
  - Appliance efficiency — possible cause, further inspection may be required
- Footer: "These are possible contributors based on your appliance profile and consumption history, not confirmed causes."

### 4.3 Appliances

Table (kWh, all `Estimated`):

| Appliance | Aug | Sep | Change |
|---|---|---|---|
| Air conditioner (1.5 T, 3★) | 120 | 155 | +35 |
| Ceiling fans (4) | 65 | 70 | +5 |
| Refrigerator (260 L) | 46 | 46 | 0 |
| Lighting (8 LED + 2 tube) | 29 | 29 | 0 |
| Television | 20 | 20 | 0 |
| Other (kitchen, laptop, router, iron) | 48 | 50 | +2 |
| **Estimated total** | **328** | **365** | **+37** |

- **What changed?** card: "Largest estimated contributor: Air conditioner (+35 kWh). Possible reasons: more operating hours or higher cooling demand."
- **Meter Reconciliation** card: Actual (meter) **390 kWh** `Measured` · Estimated appliance contribution **365 kWh** · Unallocated **25 kWh** (6 %). Note: "Unallocated units may come from appliances not yet added or usage variations. Estimates are never presented as measurements." If estimates exceed actual: "Estimates scaled to meter reading."
- Per-row detail level chip and **Improve estimate** link for partial rows (washing machine, geyser).

### 4.4 Forecast

- **Next month (Oct 2026): 405–430 kWh** · point 418 · expected change **+4 % to +10 %** · `Estimated · Medium confidence`.
- **Why** drivers: current month (390) carries 50 % weight · last 3 months average (372) · same month last year (398) · seasonal factor for Oct (1.02) · area trend +1 %.
- **Financial forecast:** Previous bill **₹2,850** (Aug) · Current **₹3,120** (Sep) · Next **₹3,250–3,500** (`Estimated`). Slab breakdown from `Demo tariff — configurable`.
- Disclaimer (verbatim): "Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components."
- Chart: last 6 actual months + forecast band.

### 4.5 Monthly Report

Auto-generated card, printable (`window.print`), PDF stretch. Layout:

1. **Header:** SAVERA Monthly Electricity Report · Household H-1024 · XYZ Colony, Ward 24 · Sep 2026 · generated on `demoNow` · `Estimated · Medium confidence`.
2. **Totals:** Consumption 390 kWh (`Measured`) · Bill ₹3,120 · vs last month +40 kWh (+11.4 %) · vs same month last year +2 %.
3. **Baseline:** Personalised 320–350 kWh (Normal season band) · position of this month vs band.
4. **Status:** ⚠️ Above normal — "Consumption is above your baseline band. Possible contributors listed below."
5. **Top appliances:** AC 155 · Fans 70 · Fridge 46 · Lighting 29 · TV 20 · Other 50 · Unallocated 25 (all estimates labelled).
6. **Changes:** AC +35 · Fans +5 · Other +2 · largest estimated contributor: AC.
7. **Forecast:** Oct 405–430 kWh · ₹3,250–3,500.
8. **Recommendations:** top three with kWh and ₹ ranges.
9. **Confidence footer:** "Confidence: Medium — based on 12 bills and 78 % appliance detail. Appliance-level figures are estimates reconciled to your meter reading; they are not measurements."

Buttons: **Print / Save as PDF** · **Share summary (copy)**.

### 4.6 Recommendations

- Hero card **Your biggest opportunity:** Air conditioner → action "Raise set-point 24 °C → 26 °C and use sleep mode" → expected impact **25–35 kWh · ₹190–270 / month** (`Estimated`). Buttons **Apply in Digital Twin** (→ `/citizen/twin?apply=rec-ac-setpoint`) · **Mark as done**.
- Ranked list (rule table keyed by contributor):
  1. AC set-point / sleep mode — 25–35 kWh · ₹190–270
  2. Reduce fan hours by 2 h/day (4 fans) — 15–20 kWh · ₹110–150
  3. Switch tube lights to LED — 6–9 kWh · ₹45–70
  4. Fridge: check door seal, keep 2 in gap from wall — 4–6 kWh · ₹30–45
  5. Standby: switch off TV/set-top box at the wall — 3–5 kWh · ₹20–40
- Every line uses "may reduce"; ₹ via marginal slab of the demo tariff; never guaranteed.

---

## 5. Rules summary for this stream

- Appliance estimates: catalogue-driven (§8.1), calibrated so H-1024 → AC ≈155, fans ≈70, fridge ≈46, lighting ≈29, TV ≈20, other ≈50, Σ ≈365, unallocated ≈25.
- Baseline: default (30 % appliance / 20 % area / 50 % bill, ±12 %) → personalised (≥3 bills, mean ± 1 SD of last 6 non-anomalous months) → seasonal (≥6 bills).
- Confidence: High ≥6 bills and ≥80 % detail · Medium 2–5 bills or ≥50 % · Low 1 bill or <50 %.
- Anomaly: > baseline.high × 1.15 → Above normal · × 1.35 → Significantly above · < baseline.low × 0.85 → Below normal; always attach possible contributors including "possible electrical issue — further inspection may be required".
- Forecast: `(0.5 × current + 0.3 × mean(last 3) + 0.2 × sameMonthLastYear || baselineMid) × seasonalFactor × (1 + areaTrend)`; range ±4 % / ±7 % / ±10 % by confidence.
- Every derived figure carries `EstimatedChip`; bill kWh and amounts carry `Measured`.
