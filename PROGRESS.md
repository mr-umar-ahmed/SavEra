# SAVERA — Progress Tracker

**Rule:** this file is updated every time a task changes state (start, finish, block, defer). Plan: `docs/IMPLEMENTATION_PLAN.md` + `docs/CONTINUATION_PLAN.md` (Phase T and Phases 4–8 detail). Deviations: `DECISIONS.md`.
Legend: ⬜ not started · 🟡 in progress · ✅ done · ❌ blocked · ⏭ deferred

_Last updated: 2026-09-25 (Phase T complete; Phase 4 next)_

## Overall

| Phase | Status | Notes |
|---|---|---|
| 0 Foundation | ✅ | complete: types, tokens, catalogues, engine, seed, stores, chrome, 49 routes, 103 tests, next build clean |
| 1 Landing + Auth | ✅ | slice S1 complete: 3D hero with particle streams, verbatim copy, 6-step loop, portals, connected layer, 6-persona auth, 6-box OTP |
| 2 Citizen Electricity | ✅ | slice S2 complete: habitat hub, household setup, 6-step wizard (9 categories, simulated OCR, seasonal baseline), 6-tab dashboard with reconciliation & printable report |
| 3 Water pipeline | ✅ | slice S3 complete: citizen setup, water dashboard with report flow, status timeline, area report, supervisor dashboard, area report telemetry, case workspace state machine, verified logs, gov water board, gov cases |
| T Theme "Savera Earth" + larger type | ✅ | reference-image palette (cream/brown/green) in light + warm dark, Plus Jakarta Sans + JetBrains Mono, larger scale; all routes verified by screenshot |
| 4 LPG | ⬜ | slice S4 queued (after Phase T) |
| 5 Green Score / Carbon | ⬜ | slice S5 queued |
| 6 Electricity Sup + Gov | ⬜ | slice S6 queued |
| 7 Connected Layer | ⬜ | slice S7 queued |
| 8 Gov intelligence, notifications, polish, demo readiness | ⬜ | slices S8, S9 + integration pass |

## Phase 0 — Foundation

| # | Task | Status | Evidence |
|---|---|---|---|
| 0.1 | Wipe old app, keep theme | ✅ | old `src/` removed; theme in ARCHITECTURE §2 |
| 0.2 | Scaffold tooling + install deps | ✅ | Next 15.5.26, React 19.3, TS 5.9, Tailwind 4.3, 546 packages |
| 0.3 | Docs (MASTER_PROMPT, ARCHITECTURE, CLAUDE, DECISIONS, IMPLEMENTATION_PLAN, docs/spec 01–06) | ✅ | files present |
| 0.4 | Shared types + pure libs (dates, format, ids, utils) | ✅ | 16 files in src/types, tests written |
| 0.5 | Design tokens + UI primitives + root layout | ✅ | globals.css, 27 ui components, theme provider |
| 0.6 | Catalogues, geo, fixtures | ✅ | appliances, barcodes, tariffs, ward-24 geo, H-1024 fixtures |
| 0.7 | Domain components, charts, maps | ✅ | PageHeader, KpiCard, StatusBadge, ProgressRing, StatusTimeline, charts, Leaflet map |
| 0.8 | Engine — electricity | ✅ | appliances, baseline, reconcile, mom, forecast, tariff, recommend |
| 0.9 | Engine — green/LPG/water/aggregate/carbon/GHG | ✅ | greenScore, lpg, water, aggregate, carbon, ghg all tested |
| 0.10 | Seed generator | ✅ | deterministic buildSeed("2026-09-25"), 6 users, 2 households, 3 areas |
| 0.11 | Stores, auth, mock API, hooks, explain provider | ✅ | session, data, twin, ui stores; API hooks; explain provider |
| 0.12 | Portal chrome + route shells + auth/landing shells | ✅ | Sidebar, TopBar, PortalShell, RoleGuard; all 49 routes exist and render |
| 0.13 | Verify & fix (typecheck, lint, test, build, route sweep) | ✅ | tsc clean, ESLint clean (0 errors), 103/103 tests pass, next build (49/49 pages) clean |
| 0.14 | Commit `feat(phase-0)` | ✅ | committed `0266205`; foundation frozen |

## Phase T — "Savera Earth" theme + typography

| # | Task | Status | Evidence |
|---|---|---|---|
| T.1 | Token layer (light + dark palettes, ink tokens, type scale, radius, shadows) | ✅ | globals.css: light Earth + dark Espresso tokens, ink/tone/stream per theme, text scale, radius 0.75rem, warm shadows; contrast script: all text tokens >= 4.5:1 |
| T.2 | Fonts (Plus Jakarta Sans + JetBrains Mono) + light default | ✅ | layout.tsx: Plus Jakarta Sans + JetBrains Mono via next/font, defaultTheme light, storageKey savera-theme-v2 |
| T.3 | Codemod hard-coded dark classes → semantic tokens | ✅ | codemod: 3,410 replacements in 92 files; leftover grep clean except intentional (rose recording state, amber tints) |
| T.4 | UI primitives restyle | ✅ | button (default/outline/positive), tabs (pill track, brown active), badge tones, inputs |
| T.5 | Domain components restyle | ✅ | PageHeader (mono copper eyebrow, 32–40 px title), KpiCard, EstimatedChip (tinted, wraps when narrow), LabelChip measured |
| T.6 | Portal chrome (sidebar, top bar, voice FAB) to match reference | ✅ | Sidebar rebuilt to reference, TopBar breadcrumb + pills, brown Reset Demo, round theme toggle, brown voice FAB |
| T.7 | Charts, maps, 3D colours | ✅ | chartTheme light/dark maps + light default before mount; AreaMap tones from theme, sepia tiles; Hero3D palette per theme |
| T.8 | Landing + auth pass | ✅ | landing + auth logos (green round sprout), SAV/ERA in primary, HUD overlap fixed, action buttons → primary |
| T.9 | Visual verification (both themes) | ✅ | Playwright screenshots of all 49 routes at 1440 px (0 page/console errors), electricity + landing in dark, 390 px mobile |
| T.10 | Docs (ARCHITECTURE §2, CLAUDE, DECISIONS) | ✅ | ARCHITECTURE §2 rewritten, CLAUDE theme line, DECISIONS #14–#17, CONTINUATION_PLAN |

## Phases 1–7 — feature slices

| Slice | Scope | Build | Review | Fix |
|---|---|---|---|---|
| S1 | Landing + Auth | ✅ | ✅ | ✅ |
| S2 | Citizen electricity (setup + dashboard) | ✅ | ✅ | ✅ |
| S3 | Water pipeline (citizen, supervisor, gov) | ✅ | ✅ | ✅ |
| S4 | LPG (citizen, supervisor, gov) | ⬜ | ⬜ | ⬜ |
| S5 | Green Score, leaderboard, progress, carbon, city green score | ⬜ | ⬜ | ⬜ |
| S6 | Grid ops, ward electricity, ADR, official alerts | ⬜ | ⬜ | ⬜ |
| S7 | Twin, voice, scan, connect, services, industrial | ⬜ | ⬜ | ⬜ |
| S8 | Gov landing, heatmap, wards, forecast, planning, analytics | ⬜ | ⬜ | ⬜ |
| S9 | Notifications pages, supervisor home, citizen hub polish | ⬜ | ⬜ | ⬜ |

## Phase 8 — Integration and demo readiness

| Task | Status |
|---|---|
| `next build` clean | ⬜ |
| Route sweep (all §5 routes 200, no runtime errors) | ⬜ |
| Console-error and forbidden-wording sweep | ⬜ |
| Playwright demo-script smoke test | ⬜ |
| Mobile pass (375 px) citizen screens | ⬜ |
| Accessibility pass | ⬜ |
| README with setup, accounts, demo script, future extensions | ⬜ |
| Final DECISIONS / CLAUDE / PROGRESS review + commit | ⬜ |

## Changelog

- 2026-09-25 01:30 — Old SavEra app removed from git; theme captured.
- 2026-09-25 01:45 — New stack scaffolded; dependencies installed.
- 2026-09-25 02:00 — MASTER_PROMPT, ARCHITECTURE, CLAUDE, DECISIONS written; Phase 0 workflow launched.
- 2026-09-25 02:16 — Types + libs and docs/spec complete.
- 2026-09-25 02:30 — UI primitives + tokens complete; catalogues and domain components started.
- 2026-09-25 02:50 — IMPLEMENTATION_PLAN.md and PROGRESS.md created.
- 2026-09-25 04:05 — Phase 1 (Slice S1 — Landing + Auth) complete: 3D hero with particle streams, 7-section landing page, role cards, 6-persona authentication, 6-box OTP, and clean 49-page build.
- 2026-09-25 04:12 — Phase 2 (Slice S2 — Citizen Electricity) complete: habitat setup hub with 12-row status breakdown, skippable household details, 6-step progressive wizard with 9 categories & simulated OCR, and full 6-tab electricity dashboard with meter reconciliation & printable report.

- 2026-09-25 — docs/CONTINUATION_PLAN.md written (Phase T theme conversion + detailed Phases 4–8). Phase T started.

- 2026-09-25 — Phase T complete: Savera Earth theme (light default + Espresso dark), Plus Jakarta Sans + JetBrains Mono, larger type scale, 3,410-class codemod, chrome rebuilt to match the reference; typecheck/lint (0 errors)/103 tests green; all routes screenshot-verified.

## Known issues / blockers

- 278 pre-existing `no-unused-vars` lint warnings (0 errors) from earlier phases; to be cleaned in Phase 8 polish.
- The Next.js dev indicator ("N" bubble) overlaps the sidebar footer in dev only; not present in production builds.
