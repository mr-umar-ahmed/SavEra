# SAVERA — Continuation Plan (Theme T + Phases 4–8)

Companion to `docs/IMPLEMENTATION_PLAN.md` (original phased plan), `docs/ARCHITECTURE.md` (module contract) and `PROGRESS.md` (live status).
Created 2026-09-25 after Phases 0–3 were committed. **Update `PROGRESS.md` whenever a task below changes state.**

Execution order: **Phase T (theme + typography) → Phase 4 (LPG) → Phase 5 (Green/Carbon) → Phase 6 (Electricity sup + gov) → Phase 7 (Connected layer) → Phase 8 (Gov intelligence, notifications, polish).**
Gate after every phase: `npm run typecheck && npm run lint && npm run test` green, `PROGRESS.md` + `DECISIONS.md` updated, commit `feat(phase-N): …`.

---

## Phase T — "Savera Earth" theme + larger typography

**Why:** user instruction (2026-09-25): adopt the reference screenshot's colour combination and fonts for the whole project, and make type larger and more legible. This supersedes the inherited dark-emerald theme (ARCHITECTURE §2, DECISIONS #2).

### T.1 Target look (from the reference image)

| Element | Reference | Token |
|---|---|---|
| Page background | warm cream | `--background #F3ECE1` |
| Sidebar surface | slightly deeper cream | `--sidebar #EEE5D6` |
| Cards | light cream, thin warm border, ~16 px radius, soft shadow | `--card #FBF7F0`, `--border #E3D7C5`, `--radius 0.75rem` |
| Ink | espresso | `--foreground #231A12`; `--soft #4A3D30`; `--muted-foreground #685A4A`; `--faint #7C6D5C` |
| Primary (active nav, primary buttons, active tab, voice FAB) | chocolate brown | `--primary #6B3D1C`, hover `#5A3217`, fg `#FBF6EE` |
| Eyebrows ("ELECTRICITY") | copper-brown mono uppercase | `text-primary` + `font-mono` |
| Positive values / green accent ("320 – 350 kWh", "TOP RECOMMENDATION", "Open Digital Twin") | forest green | `--positive #2E6B4A`, soft tint `#E3EEE2` |
| Wells / inner panels ("Bills connected" box) | darker cream | `--muted #F0E8DB`, `--inset #EAE1D2` |
| Estimated chip | amber tint fill + amber border + brown text | tone `moderate` soft fill |
| "MEASURED" chip | tan fill, brown mono | `bg-secondary` + mono |
| Delta pill (+11.4 %) | rose tint, red text | tone `critical` |
| Status tones | cyan / green / amber / red / grey, deepened for cream | `--tone-*` per theme |

**Dark companion ("Espresso"):** background `#15100C`, sidebar `#1A140F`, card `#201913`, ink `#F4EBDD`, primary caramel `#D49A62` (fg `#1B120A`), positive `#7CC59A`, tones brightened. Same token names, so every screen flips.

**Default theme becomes light** (the reference). Theme toggle keeps dark available. The landing page follows the theme too (it was always-dark before).

### T.2 Typography

- **Sans + display:** Plus Jakarta Sans (400–800) via `next/font` → `--font-sans`, `--font-display`.
- **Mono (labels, chips, meta, small figures):** JetBrains Mono → `--font-mono`.
- **Larger scale** (Tailwind v4 `@theme` overrides):

| Utility | Before | After |
|---|---|---|
| `text-2xs` (new) | — | 12 px |
| `text-xs` | 12 px | 13 px |
| `text-sm` | 14 px | 15 px |
| `text-base` | 16 px | 17 px |
| `text-lg` | 18 px | 19 px |
| `text-xl` | 20 px | 22 px |
| `text-2xl` | 24 px | 26 px |
| `text-3xl` | 30 px | 32 px |

- Codemod: `text-[9px]`/`text-[10px]` → `text-2xs`; `text-[11px]` → `text-xs`.
- Large figures stop using `font-mono` (reference shows big numbers in the sans); small figures keep mono.
- Chart ticks 12 → 13 px.

### T.3 Implementation steps

| # | Task | Files | Acceptance |
|---|---|---|---|
| T.1 | Token layer: light + dark palettes, `--soft`, `--faint`, `--inset`, `--overlay`, `--positive*`, `--primary-hover`, `--border-strong`, per-theme tones/streams, per-hue `*-ink` text tokens, warm shadows, radius 0.75rem, type scale, fonts, utilities (`glass`, `eyebrow`, `meta`, `grid-bg`, `glow-*`, `spotlight`) | `src/app/globals.css` | both themes defined; contrast ≥ 4.5:1 for `foreground`, `soft`, `muted-foreground`, `faint` on `background` and `card` (verified by script) |
| T.2 | Fonts + default light theme + theme colour | `src/app/layout.tsx` | Plus Jakarta Sans + JetBrains Mono load; light by default |
| T.3 | Codemod hard-coded dark classes → semantic tokens (context-aware: primary buttons, spinners, text on solid fills) | all `src/**/*.tsx` (script in scratchpad) | no `text-white/NN`, `border-white/NN`, `bg-white/[…]`, `bg-[#070D0A]`, `bg-[#050B08]` left; emerald → `primary`/`positive`; other hues' light text → `*-ink` |
| T.4 | Primitives restyle to match reference | `components/ui/{button,tabs,badge,card,dialog,sheet,…}` | pill buttons: brown solid / outline / green `positive` variant; tab list = bordered pill track with brown active pill |
| T.5 | Domain components restyle | `components/savera/{PageHeader,KpiCard,EstimatedChip,LabelChip,StatusBadge,DeltaPill,SectionCard,…}` | mono copper eyebrow, 32–40 px titles, chips with tinted fills |
| T.6 | Chrome to match reference | `components/layout/{Sidebar,TopBar,PortalShell,RoleSwitcher,ResetDemoButton,ThemeToggle,NotificationsDrawer}`, `components/voice/VoiceAssistant` | sidebar brand block, NAVIGATION label, brown active pill, NEW/BETA mono tags, Active Context card; top bar breadcrumb + Alerts pill + role pill + brown Reset Demo + round theme toggle; brown voice FAB |
| T.7 | Charts + maps + 3D | `components/charts/chartTheme.ts`, `components/maps/map.css`, `components/features/landing/Hero3D.tsx`, `components/twin/*` | warm grid/axis/tooltip per theme, light default before mount; warm-tinted OSM tiles; hero materials follow theme |
| T.8 | Landing + auth pass | `app/page.tsx`, `app/auth/page.tsx` | CTA gradients → brown primary; readable in both themes |
| T.9 | Visual verification | dev server + screenshots of landing, auth, citizen electricity, supervisor water, gov water in light and dark | no invisible text, no leftover neon glows |
| T.10 | Docs | `docs/ARCHITECTURE.md` §2, `CLAUDE.md` theme line, `DECISIONS.md` #14–#16, `PROGRESS.md` | updated |

**Codemod mapping (T.3):**

| Hard-coded | → token |
|---|---|
| `text-white`, `/90` | `text-foreground` (kept `text-white` on solid rose/red/blue fills; `text-primary-foreground` on primary fills) |
| `text-white/80`, `/70` | `text-soft` |
| `text-white/60`, `/50` | `text-muted-foreground` |
| `text-white/40`, `/30`, `/20` | `text-faint` |
| `border-white/5` | `border-border/60` |
| `border-white/10` | `border-border` |
| `border-white/15…/30` | `border-border-strong` |
| `divide-white/*` | `divide-border` |
| `bg-white/[0.01–0.03]` | `bg-muted/60` |
| `bg-white/[0.04–0.05]`, `bg-white/5` | `bg-muted` |
| `bg-white/10…/30` | `bg-secondary` |
| `bg-black/20…/60` | `bg-inset` |
| `bg-black/70…/90` | `bg-overlay` |
| `bg-[#070D0A]…`, `bg-[#0A0F0D]` | `bg-card` |
| `bg-[#050B08]/NN` | `bg-background/NN` |
| `text-[#050B08]`, `text-black` on primary | `text-primary-foreground` |
| solid `bg-emerald-400/500/600` with text (buttons) | `bg-primary` (+ `hover:bg-primary-hover`) |
| solid `bg-emerald-*` without text (dots, bars) | `bg-positive` |
| `text-emerald-*`, `bg-emerald-*/NN`, `border-emerald-*`, `ring-`, `from-/via-/to-emerald` | `positive` equivalents |
| `border-emerald-*` on `animate-spin` | `border-primary` |
| `shadow-emerald-*/NN` | `shadow-primary/10` |
| solid `bg-teal-400/500` / `bg-cyan-*` buttons with text | `bg-positive text-positive-foreground` |
| `text-{amber,teal,rose,cyan,sky,red,blue,violet,indigo,purple,orange,yellow,lime,green,pink}-100…600` | `text-{hue}-ink` (theme-aware: deep in light, bright in dark) |
| `text-[9px]`, `text-[10px]` / `text-[11px]` | `text-2xs` / `text-xs` |
| `font-mono` on ≥ `text-xl` figures | `font-display` |

---

## Phase 4 — LPG across all three portals (slice S4)

Spec: `docs/spec/03-lpg-citizen.md`, MASTER_PROMPT §6.7, §6.14, §6.15, §8.11, §8.13. Engine `lib/engine/lpg.ts` and hooks `useLpgAnalysis`, `useWardLpg`, `useCityDashboard` already exist (Phase 0).

| # | Task | Route / files | Acceptance |
|---|---|---|---|
| 4.1 | Gas & Heating setup: gas type, cylinder size, provider, cylinders in use, first cylinder dates, PNG branch; skip/later everywhere | `/citizen/setup/gas` | saves household + section status; toast "LPG setup saved." |
| 4.2 | LPG dashboard: current cylinder (Measured dates), remaining ring, avg rate vs typical, next refill with basis, AI insight (normal vs abnormal), usage KPI strip + cycle chart with typical line, refill prediction with Set Reminder (3/2/1 d) + Book Refill (simulated), official LPG alert banner | `/citizen/gas`, `components/features/lpg/*` | H-1024: 0.57 kg/day, 18 days, typical 0.55–0.60, Normal. H-1088: Higher consumption + safety guidance; all derived figures `Estimated` |
| 4.3 | Conservation & Safety Guidance sheet | `components/features/lpg/SafetyGuidanceSheet.tsx` | wording per spec §6; "SAVERA does not detect leaks or faults." |
| 4.4 | Add new cylinder / mark finished tabs, "finish and add" prompt, typical recomputed | `/citizen/gas/cylinder` | toasts per spec; dashboard reflects change |
| 4.5 | Usage history table + filters (3/6/12) + kg/day chart vs typical band + CSV + empty state | `/citizen/gas/history` | newest first; CSV downloads |
| 4.6 | Booking flow (Requested → Confirmed → Out for delivery → Delivered, demo advance) on services LPG tab | `/citizen/services?tab=lpg` (LPG tab only; full hub in Phase 7) | `Simulated` chip; notification pushed |
| 4.7 | Supervisor LPG 9 sections: dashboard KPIs, area overview table, heatmap (AreaMap + list), area details link, AI alerts (monitor / field inquiry / note), forecast (58k/61k/63k → ~66k, ≈4,880 cyl), planning roll-up, reports & trends (CSV, 3/6/12), notifications | `/supervisor/gas` | aggregates only, no household ids |
| 4.8 | Area consumption details (Area B sample) | `/supervisor/gas/areas/[areaId]` | 4,900 vs 4,100 kg, +19.5 %, 27 households (count), 6-month trend |
| 4.9 | Gov LPG: KPIs 56,000 → 60,000 kg, ≈4,440 cylinders, 4,120 households, Jan–Apr history → May, zone table with drill-down, alerts, links | `/gov/gas` | "Planning information — operational decisions remain with the department." |
| 4.10 | Verify + review + commit | — | gates green; `feat(phase-4)` |

## Phase 5 — Green Score, Leaderboard, Progress, Carbon (slice S5)

| # | Task | Acceptance |
|---|---|---|
| 5.1 | `/citizen/green-score`: 86/100, sub-scores (efficiency per stream, improvement, consistency), weights and normalisation explainer | engine `computeGreenScore` numbers |
| 5.2 | `/citizen/leaderboard`: top households with medals, "Your rank #84 / 700", privacy toggle (default `Green Home #n`) | toggle persists via `api.green.setVisibility` |
| 5.3 | `/citizen/progress`: #127 → #84, +43 positions, 6-month line | chart + chips |
| 5.4 | `/citizen/carbon`: inputs (commute, diet, lifestyle) + auto-pulled streams, tCO₂e/yr, donut, city/area comparison, ranked strategies, "How this is calculated" factors panel | Estimated labels; `api.carbon.setInputs` |
| 5.5 | `/gov/green-score`: average 78, histogram 80–100/60–79/40–59/<40, trend, aggregated only | no ids |
| 5.6 | Verify + commit `feat(phase-5)` | gates green |

## Phase 6 — Electricity for Supervisor + Government (slice S6)

| # | Task | Acceptance |
|---|---|---|
| 6.1 | `/supervisor/electricity` Grid Operations tab: exact KPIs (45,230 · 842 MW · 14.2 MW · 1,247), sensor matrix, live demand chart ticking, live incidents, Command Terminal → targeted citizen notification | toast + notification |
| 6.2 | Ward 24 Households tab: aggregate KPIs, area heatmap (map + list), active DR panel | no household ids |
| 6.3 | `/gov/electricity`: city grid ops + ADR create/respond/complete, averted MW increments, link to alerts | DR lifecycle works |
| 6.4 | `/gov/alerts`: publish / update / resolve official alerts (prefill via query params) → targeted notifications + stream banners | banners appear on citizen dashboards |
| 6.5 | Citizen DR event card (approve / auto / decline) on electricity dashboard + twin reduced-load flag | `respondToDrEvent` |
| 6.6 | Verify + commit `feat(phase-6)` | gates green |

## Phase 7 — Connected Layer (slice S7)

| # | Task | Acceptance |
|---|---|---|
| 7.1 | Digital twin: Home / Ward / City scenes + 2D fallback, device controls (AC 24→26 °C), projected kWh/₹, apply recommendations, DR response; header `Simulation — Digital Twin Prototype` | `/citizen/twin`, `/supervisor/twin`, `/gov/twin` |
| 7.2 | Voice assistant: all §9.2 intents per role, text fallback, help list | on every portal |
| 7.3 | `/citizen/scan`: camera + manual, 15 barcodes → specs → usage → estimate → add appliance | onboarding-accelerator copy |
| 7.4 | `/citizen/connect`: consent sheet → OTP → import → review → confirm → revoke | `Integration-ready · Simulated` |
| 7.5 | `/citizen/services`: bills + Pay (simulated) → receipt; LPG booking (from 4.6); reminders | labelled simulated |
| 7.6 | `/gov/industrial`: emissions map + status, GHG accounting tab (scopes, trend, opportunities) | simulated feeds labelled |
| 7.7 | Verify + commit `feat(phase-7)` | gates green |

## Phase 8 — Gov intelligence, notifications, polish, demo readiness (slices S8, S9 + integration)

| # | Task | Acceptance |
|---|---|---|
| 8.1 | `/gov` landing + city dashboard KPI groups + drill-down City → Zone → Ward → Area | department highlighted |
| 8.2 | `/gov/heatmap` layers (water / LPG / electricity), `/gov/wards` comparison + drill-down, `/gov/forecast`, `/gov/planning`, `/gov/analytics` (CSV) | spec §6.15 values |
| 8.3 | Notifications pages ×3 with filters, DR invites, official alert banners; supervisor home polish; citizen hub polish | live updates |
| 8.4 | Integration: `next build`, route sweep, console-error sweep, forbidden-wording sweep | zero errors |
| 8.5 | Playwright smoke test of demo script (§14) | passes headless |
| 8.6 | Mobile (375 px) + accessibility pass (labels, focus, contrast in both themes) | checked |
| 8.7 | README (positioning, setup, accounts, demo script, future extensions); final DECISIONS/CLAUDE/PROGRESS review | committed |

---

## Risks specific to this continuation

| Risk | Mitigation |
|---|---|
| Codemod turns a class into the wrong token (e.g. text on a solid fill) | context-aware rules use the enclosing class string; post-codemod grep for leftovers; screenshot review in both themes |
| Light theme exposes low-contrast text that was fine on black | per-hue `*-ink` tokens + contrast script for neutral tokens |
| Bigger type causes overflow in dense tables / KPI tiles | spot-check 1280 px and 375 px; `truncate` / `tabular-nums` where needed |
| Frozen-foundation rule vs global restyle | the restyle is an explicit user instruction; recorded in DECISIONS; feature phases after T again add new files instead of editing the foundation |
