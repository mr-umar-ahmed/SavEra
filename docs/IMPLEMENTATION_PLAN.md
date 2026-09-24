# SAVERA — Complete Implementation Plan

Companion to `docs/MASTER_PROMPT.md` (what to build), `docs/ARCHITECTURE.md` (how modules fit) and `PROGRESS.md` (live status — **update it whenever a task changes state**).

Legend used in `PROGRESS.md`: ⬜ not started · 🟡 in progress · ✅ done · ❌ blocked · ⏭ deferred (with reason in `DECISIONS.md`).

---

## 0. How the build is organised

- **Orchestration:** the work is split into phases matching MASTER_PROMPT §12. Phase 0 (foundation) is built by a sequenced set of agents because everything depends on it. Phases 1–7 are built as nine **feature slices** that own disjoint files and run in parallel, each followed by an adversarial review and a fix pass. Phase 8 is an integration/polish pass run sequentially (build → route sweep → Playwright demo script → mobile/a11y → README).
- **Frozen foundation rule:** after Phase 0, `src/types`, `src/stores`, `src/lib/{engine,api,auth,explain}`, `src/components/{ui,savera,layout,charts,maps,hooks,theme}`, `src/data` and `src/app/layout.tsx` are frozen. Feature work adds files under `src/components/features/<feature>/` and its own routes.
- **Quality gates (every phase):** `npm run typecheck && npm run lint && npm run test` green → commit `feat(phase-N): …` → `PROGRESS.md` + `CLAUDE.md` updated → `DECISIONS.md` for deviations.
- **Verification ladder:** unit tests (engine, seed, stores) → `next build` → dev-server route sweep (HTTP 200, no runtime error markup, no console errors) → Playwright walk of the demo script (§14) → manual browser pass on the theme/mobile.

---

## Phase 0 — Foundation

**Goal:** `npm run dev` boots; every route in §5 exists and renders seeded data; typecheck/lint/tests green.

| # | Task | Owner | Files | Depends on | Acceptance |
|---|---|---|---|---|---|
| 0.1 | Wipe old app, keep theme | orchestrator | repo root | — | old `src/` removed; theme captured in ARCHITECTURE §2 |
| 0.2 | Scaffold tooling | orchestrator | package.json, tsconfig, eslint, prettier, vitest, playwright, next.config | — | `npm install` ok |
| 0.3 | Docs | orchestrator + agent | MASTER_PROMPT, ARCHITECTURE, CLAUDE, DECISIONS, docs/spec/01–06 | — | all present |
| 0.4 | Shared types + pure libs | agent `types+libs` | src/types/*, src/lib/{dates,format,ids,utils}.ts (+tests) | 0.3 | tsc clean for these paths; vitest green |
| 0.5 | Design tokens + UI primitives | agent `ui-primitives+tokens` | globals.css, app/layout.tsx, components/ui/*, theme provider, public assets | — | tsc clean; theme matches §2 |
| 0.6 | Catalogues, geo, fixtures | agent `catalogues+geo+fixtures` | data/catalogue/*, data/geo/*, data/fixtures/* | 0.4 | H-1024 fixture + calibrated tariff/AC numbers |
| 0.7 | Domain components, charts, maps | agent `domain-components+charts+maps` | components/savera/*, charts/*, maps/*, hooks/* | 0.4, 0.5 | all §8 components exist; README |
| 0.8 | Engine — electricity | agent `engine-electricity` | lib/engine/{appliances,baseline,confidence,reconcile,mom,anomaly,forecast,tariff,recommend,energyProfile,completeness,twin,explain} + tests | 0.6 | H-1024 story numbers asserted in tests |
| 0.9 | Engine — green/LPG/water/aggregate/carbon/GHG | agent `engine-green-lpg-water-agg` | lib/engine/{greenScore,lpg,water,aggregate,carbon,ghg} + tests | 0.6 | state machine, LPG rates, rank 127→84 tested |
| 0.10 | Seed generator | agent `seed` | data/seed/* + test | 0.6 | deterministic; all fixed ids; spec anchors |
| 0.11 | Stores, auth, mock API, hooks, explain provider | agent `stores+api+auth` | stores/*, lib/auth/*, lib/api/**, lib/explain/*, app/api/explain | 0.8–0.10 | store test green; all §4.2 actions |
| 0.12 | Portal chrome + route shells + auth/landing shells | agent `layout+route-shells` | components/layout/*, app/{citizen,supervisor,gov}/**, app/auth, app/page | 0.7, 0.11 | every §5 route exists; RoleGuard; drawer; switcher; reset |
| 0.13 | Verify & fix | agent `verify+fix` | any (surgical) | 0.12 | typecheck, lint, test, `next build`, route sweep all clean |
| 0.14 | Commit `feat(phase-0)` | orchestrator | — | 0.13 | committed; PROGRESS updated |

---

## Phase 1 — Landing + Auth (slice S1)

| Task | Acceptance |
|---|---|
| 3D hero (r3f, particle streams, reduced-motion) | 60 fps on laptop; static fallback |
| Landing sections: what SAVERA does, the loop, portals, connected layer, impact (labelled illustrative), CTA | all present, responsive 375 px |
| `/auth`: role cards → login (zod) → OTP 123456 → role home; demo-account chips; "continue as" | all six accounts log in |
| Global chrome already from Phase 0: role switcher, notifications drawer, reset demo, theme toggle | verified working |

## Phase 2 — Citizen Electricity (slice S2)

| Task | Acceptance |
|---|---|
| `/citizen/setup/household` all fields skippable | saves + section status |
| `/citizen/setup/electricity` 6-step wizard (checklist, progressive details with Don't know/Skip/Later, status checklist, bill upload (simulated OCR) / manual, previous bills, baseline created) | works with everything skipped |
| `/citizen/electricity` six tabs | 350→390 (+11.4 %), AC ≈155 (+35), Σ≈365, unallocated ≈25, forecast 405–430, ₹3,250–3,500, completeness ≈78 %, Medium confidence, disclaimer, printable report, apply-to-twin |

## Phase 3 — Water pipeline (slice S3)

| Task | Acceptance |
|---|---|
| Citizen: home, 4-step report flow, report timeline, area status, setup/water | new report joins XYZ case; timeline live |
| Supervisor: dashboard KPIs (12/5/3/6/8), alerts, area report, case workspace (decision → assign → live verification with *Simulate field update* → field report → validation → forward), verified reports | full pipeline in one sitting |
| Gov: `/gov/water` (11.8M/10.9M/12.4M), `/gov/cases` record action → citizen + supervisor notified | notifications appear |

## Phase 4 — LPG (slice S4)

| Task | Acceptance |
|---|---|
| Citizen: dashboard, add/finish cylinder, usage, insight (H-1088 shows higher + safety guidance), refill prediction, reminders, Book Refill (simulated) + booking timeline, history | 0.57 kg/day, 18 days, typical 0.55–0.60 |
| Supervisor: 9 sections incl. heatmap, AI alert (Area B), forecast, planning, CSV | numbers consistent with seed |
| Gov: `/gov/gas` 56,000 → 60,000 kg, cylinders, drill-down | present |

## Phase 5 — Green Score, Leaderboard, Progress, Carbon (slice S5)

| Task | Acceptance |
|---|---|
| Green Score 86 with normalisation explained | sub-scores + weights |
| Leaderboard rank #84/700 (prev #127), privacy toggle | default anonymous names |
| Progress +43 positions chart | 6-month series |
| Carbon analyzer with factors panel, strategies | tCO₂e labelled estimated |
| `/gov/green-score` avg 78 + histogram | aggregated only |

## Phase 6 — Electricity for Supervisor + Gov (slice S6)

| Task | Acceptance |
|---|---|
| Grid Operations (exact KPIs, sensor matrix, live chart, incidents, command terminal → notifications) | ward + city scopes |
| Ward 24 households aggregate + area heatmap + DR panel | no household ids |
| `/gov/electricity` ADR create/respond/complete, averted MW increments | works end-to-end |
| `/gov/alerts` publish/update/resolve official alerts → targeted notifications + banners | prefill via query params |

## Phase 7 — Connected Layer (slice S7)

| Task | Acceptance |
|---|---|
| Digital twin: home/ward/city scenes + 2D fallback, device controls, projected kWh/₹, apply recommendations, DR response | labelled Simulation |
| Voice assistant (all §9.2 intents, text fallback) mounted on every portal | unrecognised → help list |
| Scan (camera + manual, 15 barcodes) → estimate → add appliance | onboarding accelerator copy |
| Connect (consent sheet → OTP → import → review → confirm → revoke) | Integration-ready · Simulated |
| Services hub (pay simulated → receipt; book refill; reminders) | labelled simulated |
| `/gov/industrial` emissions map + GHG accounting tab | simulated feeds labelled |

## Phase 8 — Gov intelligence, notifications, polish, demo readiness (slices S8, S9 + integration)

| Task | Acceptance |
|---|---|
| `/gov` landing + city dashboard drill-down, heatmap layers, ward comparison, forecast, planning, analytics (CSV) | matches §6.15 |
| Notifications pages ×3 with filters, DR invites, official alert banners | live updates |
| Integration: `next build`, route sweep, console-error sweep, forbidden-wording sweep | zero errors |
| Playwright smoke test walking the §14 demo script | passes headless |
| Mobile pass (375 px) on citizen screens; a11y pass (labels, focus, contrast) | checked |
| README (positioning, setup, demo accounts, demo script, future extensions) | written |
| Final `DECISIONS.md`, `CLAUDE.md`, `PROGRESS.md` review; commit | done |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Parallel agents editing the same file | strict ownership lists; frozen foundation; foreign edits reported |
| Engine numbers drift from spec anchors | calibration tests in engine + seed; hooks assert demo values |
| Three.js/leaflet SSR breakage | dynamic imports with `ssr:false`, verified in `next build` |
| Hydration mismatch from dates | `demoNow` in session store; pages render after mount |
| Demo state corruption | `Reset demo data` reseeds; seed version bump on schema change |
