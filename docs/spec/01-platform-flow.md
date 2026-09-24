# 01 — Platform Flow

Where this file and docs/MASTER_PROMPT.md disagree, the master prompt wins.

This document is the screen-level source of truth for the cross-cutting parts of SAVERA: positioning, the three portals, the data loop, roles and auth, the route map, global chrome and the product rules every screen must honour. Stream-specific screens live in 02–06.

---

## 1. Positioning (landing page and README copy)

Use verbatim:

> **SAVERA is an AI-powered resource intelligence and action platform** that measures household electricity, water and LPG usage, builds personalised baselines, detects abnormal consumption, predicts next-month consumption and cost, gives actionable recommendations, connects citizens with utility services, and — through digital simulation, authorised integrations, compatible hardware and human-verified government workflows — helps translate digital insight into real-world resource-saving action.

Two layers, always presented together:

- **Software layer:** measure → analyse → predict → recommend → coordinate.
- **Connected layer:** simulate → integrate → control/automate *where supported*.

One-line story per stream (used on landing "What SAVERA does" cards):

- **Electricity:** "Digitise my home → understand where electricity went → know next month's bill → act."
- **Water:** "Report my supply experience → AI groups the area → supervisor verifies on the ground → department adjusts → I'm notified."
- **LPG:** "Track my cylinder → understand my consumption → get alerted when usage changes → predict my refill."

Demo city: **Raichur, Karnataka**. Department names are generic: Electricity Department, Water Supply Board, LPG Distribution Cell. Never brand as a real utility or provider.

---

## 2. Three portals, one data loop

| Portal | Who | Scope | Sees |
|---|---|---|---|
| Citizen | Household member | One household (e.g. H-1024, XYZ Colony, Ward 24) | Own data, own estimates, area status, notifications |
| Area Supervisor / Councillor | Ward official | One ward (Ward 24: XYZ, ABC, DEF, GHI Colony) | Area aggregates and counts, AI-grouped alerts, cases, field verification |
| Government Department | City department account | City of Raichur (zones → wards → areas) | City/zone/ward/area aggregates, forecasts, planning, cases, official alerts |

The loop: **Citizen** (household data) → anonymised aggregation → **Supervisor** (ward) → **Government** (city) → official action / alerts → back to **Citizen** as notifications.

- Household data improves individual insight; aggregated data becomes area and city demand intelligence.
- No household id or name ever leaves the aggregation module (`lib/engine/aggregate.ts`). Supervisor and government screens show counts, averages, totals and statuses only.
- Human in the loop: AI detects and groups; supervisor decides; field verifies; department acts; citizen is notified.

---

## 3. Landing page `/`

Always dark, cinematic, "civic-tech meets energy". Sections in order:

1. **Hero** — animated 3D model (stylised house / city block with flowing electricity, water and gas particle streams) beside the positioning statement. Eyebrow: `AI-POWERED RESOURCE INTELLIGENCE`. Headline: **SAVERA**. Sub: the positioning paragraph. Primary pill CTA **Initialize SAVERA** → `/auth`. Secondary: "See how it works" (scrolls).
2. **What SAVERA does** — three stream cards (Electricity · Water · LPG) with the one-line stories above.
3. **The loop** — six steps: measure → analyse → predict → recommend → act → learn.
4. **Three portals** — Citizen · Area Supervisor · Government Department, with the role-card copy from §5.
5. **Connected Layer** — Digital Twin (Simulation) · Voice assistant · Smart Appliance Scan · Consent-based integration · Utility Services Hub · Automated Demand Response · Official disruption alerts. Every card carries `Simulated` or `Integration-ready`.
6. **Impact stats** — clearly labelled `Estimated · illustrative`: e.g. "Up to 8–12 % household electricity reduction (estimated)", "Water concerns verified in under 24 h (demo pipeline)", "~5,000 participating households (seeded demo)".
7. **Footer CTA** — **Initialize SAVERA**.

Respects `prefers-reduced-motion`; 3D hero has a static fallback.

---

## 4. Auth `/auth`

Three steps on one route; state is local until OTP succeeds.

### 4.1 Role cards (exact copy)

- **Citizen** — "Digitise your home, understand your electricity, water and LPG, and earn your Green Score."
- **Area Supervisor (Councillor)** — "Monitor your ward, review AI-grouped alerts, verify on the ground and coordinate with departments."
- **Government Department** — "City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas."

Selecting a card pre-fills the matching demo account in the login form and shows a `Demo` chip listing the credentials.

### 4.2 Login form

- Fields: **Email or mobile**, **Password**. Button **Continue**.
- Error copy: "We couldn't find that account. Use one of the demo accounts below." / "Incorrect password. Demo password is `savera`."
- Below the form: collapsible "Demo accounts" table (see §5).

### 4.3 Demo 2FA OTP

- Copy: "Enter the 6-digit code sent to your registered mobile." Chip `Demo · code 123456`.
- Six-box OTP input; **Verify**; "Resend code (demo)" simply toasts "Code resent (demo)".
- Wrong code: "That code didn't match. Demo code is 123456."
- Success → redirect to the role home: `/citizen`, `/supervisor`, `/gov`.

Sessions persist (`savera-session-v1`). Visiting a portal without a session or with the wrong role redirects to `/auth`.

---

## 5. Roles and demo accounts

| Role | Login | Password | OTP | Scope |
|---|---|---|---|---|
| Citizen (primary demo) | `citizen@savera.demo` / `9000000001` | `savera` | `123456` | Household H-1024, XYZ Colony, Ward 24 |
| Citizen (abnormal LPG demo) | `citizen2@savera.demo` | `savera` | `123456` | Household H-1088, ABC Colony, Ward 24 |
| Supervisor | `supervisor@savera.demo` | `savera` | `123456` | Ward 24 (XYZ, ABC, DEF, GHI Colony) |
| Govt — Electricity Dept | `electricity@savera.demo` | `savera` | `123456` | City of Raichur |
| Govt — Water Supply Board | `water@savera.demo` | `savera` | `123456` | City of Raichur |
| Govt — LPG Distribution Cell | `gas@savera.demo` | `savera` | `123456` | City of Raichur |

User ids: `u-citizen-1`, `u-citizen-2`, `u-supervisor-24`, `u-gov-electricity`, `u-gov-water`, `u-gov-gas`.

- Field assistants (Ravi Kumar, Arif Khan, Suresh M, Team 04) have **no login**. Their activity is driven by the **Simulate field update** demo control on the supervisor case screen.
- The header **role switcher** swaps between the six accounts instantly (no OTP) so a presenter can move through the demo script without re-authenticating.
- Government accounts land on `/gov` with their own department highlighted; the other two departments remain viewable because the city dashboard is shared.

---

## 6. Route map

```
/                                   Landing (3D hero, positioning, loop, portals, connected layer, impact, CTA)
/auth                               Role cards → login → OTP

/citizen                            Home Setup hub ("Digitize Your Habitat") + Setup Completeness
/citizen/setup/household            Basic household details
/citizen/setup/electricity          Appliance checklist → details wizard → bills → baseline created
/citizen/setup/water                Usage points, area, supply schedule, regional scarcity impact
/citizen/setup/gas                  LPG vs piped gas, cylinder size, provider, first cylinder
/citizen/electricity                Dashboard: Overview · This vs Last Month · Appliances · Forecast · Monthly Report · Recommendations
/citizen/water                      Water Portal Home → supply details → experience → issue details → submit
/citizen/water/reports/[id]         My Report / status timeline
/citizen/water/area                 Area Water Status
/citizen/gas                        LPG Dashboard
/citizen/gas/cylinder               Add new cylinder / mark finished
/citizen/gas/history                Usage history
/citizen/carbon                     Carbon Footprint Analyzer (New)
/citizen/green-score                Green Score breakdown
/citizen/leaderboard                Leaderboard + privacy toggle
/citizen/progress                   Rank movement over time
/citizen/twin                       My Home — Digital Twin Prototype (Simulation)
/citizen/scan                       Smart Appliance Scan & auto-onboarding
/citizen/connect                    Consent-based data integration (simulated)
/citizen/services                   Utility Services Hub (simulated bills, payments, LPG booking)
/citizen/notifications

/supervisor                         Three boxes: Electricity · Water · Gas (ward pre-assigned)
/supervisor/electricity             Grid ops + Ward 24 household aggregate + area heatmap + DR events
/supervisor/water                   Dashboard + AI Water Supply Alerts
/supervisor/water/areas/[areaId]    Area Water Report
/supervisor/water/cases/[caseId]    Decision → assign → live verification → field report → validation → forward
/supervisor/water/verified          Verified Reports & Department Updates
/supervisor/gas                     Dashboard → overview → heatmap → area → alerts → forecast → planning → reports
/supervisor/gas/areas/[areaId]
/supervisor/twin                    Ward simulation
/supervisor/notifications

/gov                                Department landing
/gov/electricity                    City grid dashboard + ADR + disruption alert publisher link
/gov/water                          City Water Dashboard
/gov/gas                            City LPG Dashboard
/gov/heatmap                        Resource Heatmap (Water / LPG / Electricity layers)
/gov/wards                          Ward & Area Comparison + drill-down
/gov/forecast                       AI Demand Forecast
/gov/planning                       Resource Planning
/gov/analytics                      City Analytics & Reports (CSV export)
/gov/green-score                    City Green Score distribution
/gov/cases                          Forwarded verified cases → record department action
/gov/alerts                         Publish official disruption alerts
/gov/industrial                     Industrial Environmental Intelligence + GHG Accounting
/gov/twin                           City simulation
/gov/notifications
```

Every route renders real seeded data. No "coming soon", no lorem ipsum, no `TODO` in the UI.

---

## 7. Global chrome (`PortalShell`)

Present on every portal page:

- **Sidebar** (256 px; mobile drawer on <lg; citizen gets a bottom tab bar on <lg): role-specific nav from `layout/nav.ts`. Active item emerald pill.
- **Top bar:** breadcrumb · scope badge (`Ward 24` / `Water Supply Board` / `H-1024 · XYZ Colony`) · **ThemeToggle** · **Notifications** bell with unread count → drawer · **RoleSwitcher** dropdown listing all six demo accounts · **Reset demo data** (confirm dialog: "This reseeds all demo data for today's date. Continue?") · avatar.
- **Floating voice assistant** button (bottom-right; above the citizen tab bar). See spec 06 §2.
- **Notifications drawer:** grouped Today / Earlier; each item has stream icon, title, body, relative time, read dot; "Mark all read". Clicking navigates to the linked screen.
- **Official alert banner** (`AlertBanner`) on the relevant stream dashboard when an active `OfficialAlert` targets the user's area/ward.
- Skeletons until mounted; toast on every write; keyboard accessible.

Citizen nav order: Home · Electricity · Water · LPG · Carbon · Green Score · Leaderboard · Progress · Digital Twin · Scan · Connect · Services · Notifications.
Supervisor nav: Home · Electricity · Water · Gas · Ward Twin · Notifications.
Government nav: Home · Electricity · Water · LPG · Heatmap · Wards · Forecast · Planning · Analytics · Green Score · Cases · Alerts · Industrial · City Twin · Notifications.

---

## 8. Product rules (hard requirements on every screen)

1. **Estimates are labelled estimates.** Every derived number (appliance kWh, forecast, bill range, water availability, refill date, city demand) renders `Estimated · <High|Medium|Low> confidence` with a tooltip listing inputs. Measured values (bill kWh, cylinder dates) are not labelled estimated.
2. **AI never asserts a physical cause.** Allowed phrases: "possible contributors", "possible cause — further inspection may be required", "possible supply-demand gap", "possible leakage — check for safety", "may reduce". Forbidden: "faulty", "leak detected", "broken", "your AC is faulty".
3. **Never block the user.** Every onboarding field has *Don't know* / *Skip for now* / *Set up later*. Dashboards work with one bill and a partial appliance list. Completeness is a score, never a gate.
4. **Privacy by aggregation.** Supervisor and government see aggregates and counts only. Leaderboard names are opt-in; default `Green Home #<n>`.
5. **Green Score is normalised** (per person, per home type, vs ward peers) — lowest consumption does not automatically win.
6. **Simulation is labelled simulation.** Twin screens are titled "Simulation — Digital Twin Prototype", never "live".
7. **No fake integrations.** OCR, payments, LPG booking, government import, IoT control, emissions feeds are simulated and labelled `Simulated` / `Integration-ready`. API Setu, BBPS, OCEMS, Matter/OpenADR are referenced only as "designed to integrate with".
8. **Official alerts are official** — published by a department account, never by AI.
9. **Human in the loop** — AI detects/groups; supervisor decides; field verifies; department acts; citizen notified.
10. **Indian context** — ₹, kWh, litres, kg, 14.2 kg cylinders, wards/colonies, BEE star ratings, PIN codes; Indian digit grouping (`₹3,120`, `4,50,000 L`).

---

## 9. Status palette and chips

| Tone | Meaning | Colour |
|---|---|---|
| optimal | Optimal / Below normal | cyan |
| normal | Normal / Stable / Verified / Resolved | emerald |
| moderate | Moderate / Higher than baseline / Increasing / Pending / Elevated | amber |
| critical | Critical / Abnormally high / High increase / Exceedance | red |
| unknown | Unknown / not tracked | grey |

Always pair colour with a label or icon. Chips: `Estimated · Medium confidence` · `Simulated` · `Integration-ready` · `Simulation` · `Official` · `Demo` · `Live feed (simulated)` · `New` · `Measured`.

---

## 10. Demo script (README; Playwright smoke test walks it)

1. Landing → **Initialize SAVERA** → Citizen login → OTP `123456`.
2. Home Setup hub → completeness 78 % → Electricity dashboard: This vs Last Month → Appliances (AC +35, reconciliation) → Forecast (405–430 kWh, ₹3,250–3,500) → top recommendation → apply in **Digital Twin**, watch kWh/₹ drop.
3. Voice: "when will my LPG cylinder finish" → LPG dashboard → refill prediction → **Book Refill (simulated)**.
4. Water: today's supply → "Less than usual" / insufficient → submit report → timeline at *AI Area Analysis*.
5. Switch to Supervisor → Water → XYZ Colony alert (78 households) → Area Water Report → Assign Ravi Kumar → *Simulate field update* → Field report → Confirm → Forward to Water Department.
6. Switch to Government (Water) → Cases → record "Supply adjustment scheduled, 7:00–8:15 AM" → City Water dashboard → Heatmap → Ward comparison → Forecast → Planning.
7. Switch to Government (Electricity) → grid dashboard → create DR event → publish a planned interruption for Ward 24.
8. Back to Citizen → notifications show department action, DR event and official alert → Green Score 86 → Leaderboard #84 → Progress (+43 positions).
9. Close on Government → Industrial Environmental Intelligence and City Green Score.

Must run end-to-end in under six minutes without a refresh.

---

## 11. Decisions already made

- Electricity has a government module (`/gov/electricity` = grid ops + ADR + disruption alerts).
- No separate field-assistant login; `/field` is an optional stretch.
- No backend; state persists in localStorage; mock API designed for drop-in replacement.
- Badges, certificates and rewards are **not** built (README future extensions).
- Demo tariff, emission factors and thresholds are configurable, labelled demo data files.
