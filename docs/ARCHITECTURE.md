# SAVERA — Architecture Contract

This file is the **binding contract** between all modules. Every builder (human or agent) codes against it.
If you must deviate, update this file **and** add a line to `DECISIONS.md`.
Product rules live in `docs/MASTER_PROMPT.md` §2 and are non-negotiable.

---

## 1. Stack (installed, pinned in package.json)

Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 (`@theme` tokens) · shadcn-style components hand-authored on Radix primitives · lucide-react · framer-motion · Zustand 5 (`persist`) · react-hook-form + zod v4 · Recharts 3 · react-leaflet 5 + leaflet (OSM tiles, dynamic import) · @react-three/fiber 9 + drei 10 + three · html5-qrcode · sonner (toasts) · next-themes · Vitest 3 · Playwright.

Commands: `npm run dev` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:e2e` · `npm run build`.

---

## 2. Visual theme — "Savera Earth" (Phase T, supersedes the inherited dark-emerald theme)

Reference: the user-supplied screenshot of the electricity dashboard (cream surfaces, chocolate primary, forest-green accent, mono labels). Full rationale and codemod mapping: `docs/CONTINUATION_PLAN.md` Phase T.

- **Themes:** light "Earth" is the **default**; dark "Espresso" is the companion. Both are driven by the same CSS tokens in `src/app/globals.css` (`:root` = light, `.dark` = dark), so every screen flips with the theme toggle. `next-themes` class strategy, `storageKey="savera-theme-v2"`. The landing page follows the theme too.
- **Surfaces (light / dark):** page `--background #F3ECE1 / #15100C`, sidebar `#EEE5D6 / #1A140F`, card `#FBF7F0 / #201913`, wells `--muted #F0E8DB`, `--inset #EAE1D2`, borders `--border #E3D7C5`, `--border-strong #CDBCA4`.
- **Ink:** `text-foreground` (#231A12), `text-soft` (#4A3D30), `text-muted-foreground` (#665849), `text-faint` (#75665A) — all >= 4.5:1 on page and card in both themes. Never use `text-white/NN`, `border-white/NN` or `bg-[#hex]` surfaces: use the tokens.
- **Primary:** chocolate `--primary #6B3D1C` (hover `--primary-hover`, cream foreground) — active nav pill, primary buttons, active tab, voice FAB, Reset Demo. Dark: caramel `#D49A62`.
- **Positive / brand green:** `--positive #2E6B4A` (`text-positive`, `bg-positive-soft`, `Button variant="positive"`) — good values, logo mark, secondary CTA ("Open Digital Twin").
- **Hue text:** bright palette text classes are replaced by theme-aware ink tokens `text-{amber|teal|rose|cyan|sky|red|blue|violet|indigo|purple|orange|yellow|lime|green|pink}-ink` (deep in light, bright in dark). Tints (`bg-amber-500/10`) and borders keep the Tailwind palette.
- **Fonts:** Plus Jakarta Sans (`font-sans`, `font-display`, 400–800) and JetBrains Mono (`font-mono`) for eyebrows, chips, meta and small figures. Large figures use the sans.
- **Type scale (larger, Phase T):** `text-2xs` 12 px (new) · `text-xs` 13 · `text-sm` 15 · `text-base` 17 · `text-lg` 19 · `text-xl` 22 · `text-2xl` 26 · `text-3xl` 32 · `text-4xl` 40. Page titles `text-3xl sm:text-4xl font-extrabold`; eyebrows use `.eyebrow` (mono, copper, 0.14em tracking).
- **Shape:** `--radius 0.75rem` (lg 12 · xl 15 · 2xl 18 · 3xl 24 px); cards `glass` = `bg-card border shadow-sm`; buttons and tabs are pills; warm low shadows.
- **Chrome:** sidebar 272 px (`w-68`) with brand block (green round logo, `v2.0` mono chip, portal name), mono `NAVIGATION` label, brown active pill, mono `NEW`/`BETA` tags and an Active Context card; 80 px top bar with breadcrumb (`SAVERA / Section`, section in primary), Alerts pill with red count, persona pill, brown Reset Demo, round theme toggle.
- **Charts:** `useChartTheme()` returns `CHART_LIGHT` (default and before mount) or `CHART` (dark) — warm grid/axis, cream tooltip, tone/stream maps per theme, 13 px ticks. Maps: warm sepia OSM tiles (inverted and warmed in dark); polygon tones from `useChartTheme().tone`.
- **Motion:** framer-motion fade/slide on mount; respect `prefers-reduced-motion`.

### Status palette (use everywhere; always pair colour with label/icon)

Hues are fixed; shades are deepened on cream. Use `bg-tone-*` / `text-tone-*` utilities (they follow the theme).

| Tone | Meaning | Light | Dark |
|---|---|---|---|
| `optimal` | Optimal / Below normal | `#0E6F86` (cyan) | `#4FCBDB` |
| `normal` | Normal / Stable / Verified / Resolved | `#2E7550` (green) | `#5FC48D` |
| `moderate` | Moderate / Higher than baseline / Increasing / Pending / Elevated | `#9A5A0B` (amber) | `#EDAA45` |
| `critical` | Critical / Abnormally high / High increase / Exceedance | `#B0372A` (red) | `#F07868` |
| `unknown` | Unknown / not tracked | `#6B6259` (grey) | `#A09585` |

### Stream colours

| Stream | Light | Dark | Utility |
|---|---|---|---|
| electricity | `#95570A` | `#EDAA45` | `stream-electricity` |
| water | `#1D6C9C` | `#62B9E6` | `stream-water` |
| lpg | `#B23A4C` | `#F07F8F` | `stream-lpg` |
| carbon / green | `#2E7550` | `#5FC48D` | `stream-green` |

CSS tokens live in `src/app/globals.css`; `@theme inline` maps them to Tailwind colours (`--color-tone-*: var(--tone-*)`, `--color-stream-*`, `--color-*-ink`, plus the shadcn variables) so `bg-tone-critical`, `text-amber-ink` and `bg-primary` all follow the theme.

### Chips (mandatory labels)

`Estimated · <High|Medium|Low> confidence` (tooltip lists inputs) · `Simulated` · `Integration-ready` · `Simulation` · `Official` · `Demo` · `Live feed (simulated)` · `New`.

---

## 3. Directory layout and ownership

```
src/
  app/
    layout.tsx                 fonts (Plus Jakarta Sans, JetBrains Mono), ThemeProvider (light default), Toaster, StoreHydrator
    globals.css                tokens
    page.tsx                   landing
    auth/page.tsx
    citizen/layout.tsx         <PortalShell role="citizen">
    citizen/**                 citizen routes (see MASTER_PROMPT §5)
    supervisor/layout.tsx      <PortalShell role="supervisor">
    supervisor/**
    gov/layout.tsx             <PortalShell role="gov">
    gov/**
  components/
    ui/                        shadcn-style primitives (button, card, badge, tabs, dialog, sheet, select, switch, slider, input, label, textarea, tooltip, progress, skeleton, table, separator, scroll-area, dropdown-menu, radio-group, checkbox, accordion, avatar, popover, alert)
    savera/                    domain primitives (see §8)
    layout/                    PortalShell, Sidebar, TopBar, RoleSwitcher, NotificationsDrawer, ResetDemoButton, ThemeToggle, RoleGuard, nav.ts
    charts/                    chartTheme.ts + reusable Recharts wrappers
    maps/                      AreaMap (react-leaflet, dynamic import, ssr:false)
    twin/                      TwinCanvas, HomeScene, WardScene, CityScene, Twin2DFallback
    voice/                     VoiceAssistant (floating button + panel)
    features/<feature>/        feature-specific components, owned by the feature's builder
  lib/
    utils.ts                   cn()
    format.ts                  Indian number/currency/unit formatting
    dates.ts                   month keys, seasons, day math (pure, no Date.now() inside engine paths)
    ids.ts                     newId(prefix)
    engine/                    pure, unit-tested (see §6)
    api/                       mock async API + hooks (see §5)
    auth/                      accounts.ts, roles.ts
    voice/                     intents.ts, useSpeech.ts
    explain/                   ExplanationProvider (RuleBased default, Anthropic optional)
  data/
    catalogue/appliances.ts    ApplianceCatalogueEntry[] + question definitions
    catalogue/barcodes.ts      ~15 BarcodeEntry
    catalogue/tariff.ts        DEMO_TARIFF (labelled "Demo tariff — configurable")
    catalogue/emissionFactors.ts
    catalogue/thresholds.ts    industrial thresholds, aggregate status thresholds
    geo/raichur.ts             zones, wards, areas with approximate polygons + centroids
    fixtures/h1024.ts          canonical primary demo household (appliances, bills, cylinders, water)
    fixtures/h1088.ts          abnormal-LPG demo household
    seed/prng.ts               mulberry32 seeded PRNG
    seed/index.ts              buildSeed(now: string): SeedDb  (deterministic for a given `now`)
    seed/*.ts                  households, bills, lpg, water, aggregates, grid, industrial, notifications, greenScore
  stores/
    data.ts                    useDataStore — the persisted demo database (SeedDb + actions)
    session.ts                 useSessionStore — auth, current user, demoNow
    twin.ts                    useTwinStore — simulation state
    ui.ts                      useUiStore — drawers, voice panel, twin 2D/3D preference
  types/
    index.ts                   re-exports everything below
    common.ts geo.ts auth.ts household.ts electricity.ts water.ts lpg.ts aggregate.ts greenScore.ts carbon.ts notifications.ts connected.ts industrial.ts seed.ts
e2e/demo-script.spec.ts        Playwright smoke test of the demo script
docs/                          MASTER_PROMPT.md, ARCHITECTURE.md, spec/
```

**Ownership rule for parallel builders:** a builder edits only the files/folders assigned to it. Shared foundation files (`types/`, `stores/`, `lib/engine/`, `lib/api/`, `components/ui|savera|layout|charts|maps`, `data/`) are frozen after Phase 0; if a builder needs a change there, it adds a **new** file (e.g. `lib/api/water-extra.ts`, `components/features/water/*`) instead of editing a frozen one, and notes it in its report.

---

## 4. Stores

All stores are Zustand 5 with `persist` (localStorage). Keys: `savera-data-v1`, `savera-session-v1`, `savera-twin-v1`, `savera-ui-v1`. Portal pages are client components and render skeletons until `useHasMounted()` is true (avoids hydration mismatch).

### 4.1 `useSessionStore`

```ts
interface SessionState {
  user: User | null;
  pendingUserId: string | null;            // between password and OTP
  demoNow: string;                         // ISO date (YYYY-MM-DD), set on first client load; all seed/engine math uses it
  login(identifier: string, password: string): { ok: boolean; error?: string };   // identifier = email or mobile
  verifyOtp(code: string): { ok: boolean; error?: string };                         // '123456'
  logout(): void;
  switchAccount(userId: string): void;     // instant, no OTP (presenter role switcher)
  setDisplayNamePublic(v: boolean): void;
}
```

Demo accounts live in `lib/auth/accounts.ts` (`DEMO_ACCOUNTS: DemoAccount[]`, `findAccount(identifier)`), password `savera`, OTP `123456`.

### 4.2 `useDataStore` — the demo database

State = `SeedDb` (all collections, see `types/seed.ts`) + `seedVersion`, `seededFor` (demoNow) + actions. On boot, `StoreHydrator` (in root layout) calls `ensureSeeded(demoNow)` which reseeds if empty, if `seedVersion !== SEED_VERSION`, or if `seededFor !== demoNow`.

Collections (arrays, ids unique): `users, zones, wards, areas, households, appliances, bills, waterSchedules, waterReports, waterCases, fieldAssistants, cylinders, lpgBookings, areaAggregates, gridSnapshot, gridIncidents, broadcasts, drEvents, officialAlerts, industrialUnits, ghgActivity, notifications, consents, transactions, reminders, carbonInputs, greenScoreHistory, leaderboard`.

Actions (all synchronous, return the created/updated entity where useful):

```ts
ensureSeeded(now: string): void; resetDemo(now: string): void;
// household / electricity
updateHousehold(id, patch: Partial<Household>): void;
upsertAppliance(a: Appliance): void; removeAppliance(id: string): void;
setSectionStatus(householdId, section: SetupSection, status: SetupStatus): void;
addBill(b: ElectricityBill): void;
// water
addWaterReport(r: WaterReport): { report: WaterReport; case: WaterCase | null };  // attaches to open case in same area/window or creates one via engine
updateWaterCase(id, patch: Partial<WaterCase>): WaterCase;
// lpg
addCylinder(c: LpgCylinder): void; finishCylinder(id, finishDate: string): void;
upsertLpgBooking(b: LpgBooking): void;
// green / carbon
setLeaderboardVisibility(householdId, publicName: boolean): void;
setCarbonInputs(householdId, inputs: CarbonInputs): void;
// notifications
pushNotification(n: NotificationInput): Notification;   // NotificationInput = Omit<Notification,'id'|'createdAt'|'read'>
markNotificationRead(id): void; markAllRead(target: NotificationTarget): void;
// official alerts + DR
publishAlert(a: OfficialAlertInput): OfficialAlert; updateAlert(id, patch): OfficialAlert;
createDrEvent(e: DrEventInput): DrEvent; updateDrEvent(id, patch): DrEvent; respondToDrEvent(id, householdId, response: 'approve'|'auto'|'decline'): DrEvent;
pushBroadcast(b: BroadcastInput): Broadcast;
// connect / services
grantConsent(g: ConsentGrant): void; revokeConsent(source: ConsentSource): void; applyImport(householdId, source, fields: ImportedFields): void;
addTransaction(t: ServiceTransaction): void; updateTransaction(ref, patch): void; addReminder(r: Reminder): void;
```

**Notification targeting:** `Notification.target: { role: Role; householdIds?: string[]; areaIds?: string[]; wardIds?: string[]; departments?: Department[] }`. A user sees a notification when `role` matches and (no narrower field is set, or their household/area/ward/department is included). `selectNotificationsFor(user)` in `lib/api/notifications.ts` implements this.

### 4.3 `useTwinStore`

```ts
interface TwinDevice { id: 'ac'|'fan'|'lights'|'fridge'|'geyser'|'tv'; label: string; on: boolean; kw: number; setpointC?: number; hoursPerDay: number; flexible: boolean; }
interface TwinState { devices: TwinDevice[]; baselineMonthlyKwh: number; appliedRecommendationIds: string[]; drReduced: boolean;
  setDevice(id, patch): void; applyRecommendation(id: string): void; setDrReduced(v: boolean): void; reset(): void; }
```
Projected kWh/₹ are computed from devices via `engine/twin.ts: projectTwin(devices, tariff)`.

### 4.4 `useUiStore`
`{ notificationsOpen, voiceOpen, twinMode: '3d'|'2d', reducedMotion, setters }`.

---

## 5. Mock API layer (`src/lib/api/`)

- Every write goes through an **async** function in `lib/api/<domain>.ts` that awaits `delay(250–600ms)`, calls the store action, and returns a typed `ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }`.
- Reads for pages come from **hooks** in `lib/api/hooks/*.ts` that select from `useDataStore` and memoize engine computations, e.g. `useCurrentHousehold()`, `useEnergyAnalysis(householdId)`, `useLpgAnalysis(householdId)`, `useWaterHome(householdId)`, `useWardWater(wardId)`, `useWardLpg(wardId)`, `useWardElectricity(wardId)`, `useCityDashboard()`, `useNotifications()`.
- `api/index.ts` exports `api = { household, electricity, water, lpg, green, carbon, notifications, alerts, dr, grid, connect, services }`.
- Simulated integrations (`simulateOcr(file)`, `simulateImport(source)`, `simulatePayment()`, `simulateBooking()`) live in `lib/api/simulated.ts`, each returning `{ simulated: true, ... }`.

---

## 6. Engine (`src/lib/engine/`) — pure, typed, unit-tested with Vitest (`*.test.ts` beside each module)

Signatures (return types in `types/`):

```ts
// appliances.ts   (§8.1)
estimateAppliance(a: Appliance, opts?: { season?: Season }): ApplianceEstimate
estimateAppliances(as: Appliance[], opts?): ApplianceEstimate[]
applianceDetailScore(as: Appliance[]): number            // 0..1
// baseline.ts     (§8.2)
buildDefaultBaseline(i: { applianceKwh: number; areaAvgKwh?: number; billKwh?: number }): Baseline
buildPersonalizedBaseline(bills: ElectricityBill[], excludeIds?: string[]): Baseline | null
buildSeasonalBaselines(bills: ElectricityBill[]): SeasonalBaseline[] | null
selectBaseline(i: { bills; applianceKwh; areaAvgKwh?; month: MonthKey }): Baseline
// confidence.ts   (§8.3)
computeConfidence(i: { billCount: number; detailScore: number }): ConfidenceLevel
// reconcile.ts    (§8.4)
reconcile(actualKwh: number, estimates: ApplianceEstimate[]): Reconciliation
// mom.ts          (§8.5)
compareMonths(prev: { kwh; estimates }, curr: { kwh; estimates }, ctx?: { newApplianceTypes?; hoursChanged?; occupancyChanged?; seasonChanged? }): MonthOnMonth
// anomaly.ts      (§8.6)
classifyConsumption(kwh: number, baseline: Baseline): { status: ConsumptionStatus; contributors: string[] }
// forecast.ts     (§8.7)
forecastKwh(i: { current; last3: number[]; sameMonthLastYear?: number; baselineMid: number; nextMonth: MonthKey; areaTrend?: number; confidence: ConfidenceLevel }): KwhForecast
seasonalFactor(month: MonthKey): number
// tariff.ts       (§8.8)
computeBill(kwh: number, tariff?: Tariff): BillBreakdown
marginalRate(kwh: number, tariff?: Tariff): number
// recommend.ts    (§8.9)
recommend(estimates: ApplianceEstimate[], appliances: Appliance[], tariff?: Tariff): Recommendation[]
// energyProfile.ts (orchestrator used by hooks)
buildEnergyAnalysis(i: { household; appliances; bills; areaAvgKwh?; now: string }): EnergyAnalysis
// completeness.ts
computeCompleteness(i: { household; appliances; bills; hasWaterSetup; hasLpgSetup; hasCarbon }): CompletenessReport
// greenScore.ts   (§8.10)
computeGreenScore(i: GreenScoreInput): GreenScoreResult
buildLeaderboard(entries: LeaderboardSeedEntry[], you: { householdId; score }): LeaderboardResult
// lpg.ts          (§8.11)
analyzeLpg(cylinders: LpgCylinder[], now: string): LpgAnalysis
// water.ts        (§8.12)
groupReportsIntoCases(i: { reports; area; schedule; existing: WaterCase[]; now }): WaterCase[]
assessSeverity(breakdown: WaterBreakdown, respondents: number): CaseSeverity
transitionCase(c: WaterCase, ev: CaseEvent): WaterCase       // throws on illegal transition
caseTimeline(c: WaterCase): TimelineStep[]                    // citizen-facing 5 steps
// aggregate.ts    (§8.13)
rollup(aggs: AreaAggregate[], geo: { wards; zones }): { wards: WardAggregate[]; zones: ZoneAggregate[]; city: CityAggregate }
statusVsBaseline(current: number, baseline: number, stream: Stream): AggStatus
forecastDemand(series: number[], seasonal?: number): number
cylinderRequirement(kg: number): number                        // ceil(kg/14.2*1.05)
// carbon.ts       (§8.14)
computeCarbon(i: CarbonInputs & { kwhPerMonth; lpgKgPerMonth; litresPerDay }, factors?): CarbonResult
// ghg.ts          (§8.15)
computeGhg(activity: GhgActivity[], factors?): GhgInventory[]
classifyEmissions(readings: EmissionReadings, thresholds: EmissionThresholds): EmissionStatus
// twin.ts
projectTwin(devices: TwinDevice[], tariff?: Tariff): { kwhPerMonth: number; rupees: number; kwNow: number }
// explain.ts      (§8.16)
explain(kind: ExplanationKind, ctx: Record<string, unknown>): string
```

Calibration targets (tests assert these with the `fixtures/h1024.ts` appliances): AC ≈155, fans ≈70, fridge ≈46, lighting ≈29, TV ≈20, other ≈50 (±10 %), Σ ≈ 365 → unallocated ≈ 25 against 390 actual. Baseline for Sep ≈ 320–350. Forecast 405–430 kWh, bill ₹3,250–3,500 with `DEMO_TARIFF`. LPG typical 0.55–0.60 kg/day, current 0.57. Green Score 86, rank 127 → 84.

**Wording rules baked into `explain.ts`:** "possible contributors", "possible cause — further inspection may be required", "possible supply-demand gap", "possible leakage — check for safety", "may reduce". Never "faulty", "leak detected", "broken".

---

## 7. Fixed identifiers (seed)

- Zones: `zone-1` (Zone 1 · North), `zone-2` (Zone 2 · Central), `zone-3` (Zone 3 · South). Ward 24 is in `zone-3`.
- Wards: `ward-03, ward-07, ward-09, ward-11, ward-15, ward-18, ward-21, ward-24` (`number` 3…24, `name` "Ward 24").
- Ward 24 areas: `area-xyz` XYZ Colony (code `A`), `area-abc` ABC Colony (`B`), `area-def` DEF Colony (`C`), `area-ghi` GHI Colony (`D`). Other wards: 3–4 areas each with ids `area-w07-1…`, realistic colony names.
- Households: `H-1024` (primary, `area-xyz`), `H-1088` (abnormal LPG, `area-abc`), others `H-1001…H-1099` excluding those two.
- Users: `u-citizen-1` (H-1024), `u-citizen-2` (H-1088), `u-supervisor-24`, `u-gov-electricity`, `u-gov-water`, `u-gov-gas`.
- Field assistants: `fa-ravi` Ravi Kumar, `fa-arif` Arif Khan, `fa-suresh` Suresh M, `fa-team04` Team 04.
- Water cases: `case-xyz-001` (XYZ, 78 reports, state `under_review`), `case-ghi-001` (56, `verification_assigned`), `case-abc-001` (34, `verification_in_progress`), `case-def-001` (12, `verified`), plus historical `case-xyz-h1` (`forwarded`), `case-w18-h1` (`action_scheduled`), `case-w11-h1` (`resolved`), `case-w07-h1` (`detected`), `case-w21-h1` (`not_confirmed`), `case-w15-h1` (`needs_more`).
- DR events: `dr-001` (active), `dr-002` (scheduled), `dr-003` (completed). Alerts: `alert-001` (active water disruption Ward 18), `alert-002` (resolved power interruption Ward 07).
- Industrial units: `ind-01…ind-08`. LPG bookings: `bk-…`. Transactions: `txn-…`. Notifications: `ntf-…`. Reports: `wr-…`. Cylinders: `cyl-…`.

Month keys are `YYYY-MM`. "Current month" = month of `demoNow`; "previous" = the month before. Relative anchors: current LPG cylinder started `demoNow − 18 days`; the two previous cycles are 25 days each immediately before.

---

## 8. Domain components (`components/savera/`)

```
EstimatedChip({ confidence?: ConfidenceLevel; inputs?: string[]; className? })     // "Estimated · Medium confidence" + tooltip
ConfidenceChip({ level })
LabelChip({ kind: 'simulated'|'integration-ready'|'simulation'|'official'|'demo'|'live'|'new'|'measured' })
StatusBadge({ tone: Tone; label: string; size?: 'sm'|'md' })   // dot + label
StatusDot({ tone })
KpiCard({ label; value: ReactNode; sub?; icon?: LucideIcon; tone?; delta?: { value: number; suffix?: string; invert?: boolean }; estimated?: boolean; confidence?; inputs?; className? })
PageHeader({ eyebrow?; title; description?; actions?: ReactNode; chips?: ReactNode; backHref? })
SectionCard({ title; description?; icon?; actions?; children; tone?; className? })
EmptyState({ icon?; title; description?; action?: { label; href? ; onClick? } })
DeltaPill({ value: number; unit?: string; invert?: boolean })   // +11.4 % style, colour by sign
StatusTimeline({ steps: TimelineStep[] })                        // vertical, done/active/pending
DemoControl({ label; description?; onClick; icon?; loading? })   // dashed amber "Demo" button
InfoTooltip({ content; children? })
StreamIcon({ stream; className? })   + streamTone(stream) + streamLabel(stream)
ChoiceGrid({ options: { value; label; description?; icon? }[]; value; onChange; columns? })
SkipRow({ onDontKnow?; onSkip; onLater })                         // "Don't know · Skip for now · Set up later"
AlertBanner({ alert: OfficialAlert })                              // official disruption banner
NumberStat({ value; unit; label })                                 // big number display
```

`lib/format.ts`: `formatINR(n)` → `₹3,120`; `formatIN(n)` → `45,230` / `4,50,000`; `formatKwh(n)`; `formatLitres(n)` (uses lakhs ≥ 1,00,000: `4.5 lakh L` optional `long` form `4,50,000 L`); `formatKg(n, d=1)`; `formatPct(n)`; `formatDate(iso)` → `22 Sep 2026`; `formatMonth('2026-09')` → `Sep 2026`; `formatRange(lo, hi, unit)`; `formatTime('07:00')` → `7:00 AM`.

---

## 9. Layout

`PortalShell({ role, children })`: fixed sidebar (nav from `layout/nav.ts` per role), top bar (breadcrumb, ward/department badge, ThemeToggle, NotificationsDrawer trigger with unread count, RoleSwitcher dropdown listing all six demo accounts, ResetDemoButton, avatar), `RoleGuard` (redirect to `/auth` if no user or wrong role), floating `VoiceAssistant`, mobile drawer nav. Citizen shell is mobile-first (bottom tab bar on <lg), supervisor/gov desktop-first.

Every portal page: `'use client'`, wraps content in `<PageHeader>` + cards, shows `<Skeleton>` until mounted, uses `toast.success/…` from sonner for every write, and never renders "coming soon"/"TODO"/lorem.

---

## 10. Voice intents (`lib/voice/intents.ts`)

`matchIntent(text: string, role: Role): IntentMatch | null` over a keyword table; `IntentMatch = { id; say: string; navigateTo?: string; action?: (ctx) => void }`. Unrecognised → the "I can help with…" list for the role. `useSpeech()` wraps Web Speech API with graceful fallback to text input.

---

## 11. Twin

`components/twin/TwinCanvas` (r3f, dynamic import, `frameloop="demand"` when idle) with scenes `HomeScene` (isometric house, 6 devices, animated particle streams for electricity/water/gas), `WardScene` (area blocks coloured by status tone), `CityScene` (zones → wards). `Twin2DFallback` renders the same data as an SVG isometric grid. `useUiStore.twinMode` toggles. Always titled "Simulation — Digital Twin Prototype".
