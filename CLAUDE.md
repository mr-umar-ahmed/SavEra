# SAVERA — project guide for Claude Code

SAVERA is an AI-powered household-to-city resource intelligence platform for **electricity, water and LPG** (demo city: Raichur, Karnataka). Hackathon-grade, fully clickable, mock-data-driven Next.js prototype. No backend.

**Source of truth:** `docs/MASTER_PROMPT.md` (product + build spec), `docs/ARCHITECTURE.md` (binding module contract), `docs/IMPLEMENTATION_PLAN.md` (phased plan), `PROGRESS.md` (live status), `DECISIONS.md` (deviations). Read them before changing anything.

**Progress rule:** whenever a task or phase starts, finishes, blocks or is deferred, update `PROGRESS.md` (status table, evidence, changelog line with time). Never finish a piece of work without recording it there.

## Stack

Next.js 15.5 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn-style components on Radix (hand-authored in `src/components/ui`) · lucide-react · framer-motion · Zustand 5 (persist) · react-hook-form + zod 4 · Recharts 3 · react-leaflet 5 · @react-three/fiber 9 + drei · html5-qrcode · sonner · next-themes · Vitest · Playwright.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run test         # vitest (engine unit tests)
npm run test:e2e     # playwright demo-script smoke test (starts dev server)
npm run build
```

After every phase: `npm run typecheck && npm run lint && npm run test` must be green.

## Demo accounts (password `savera`, OTP `123456`)

| Role | Login | Scope |
|---|---|---|
| Citizen (primary) | `citizen@savera.demo` or `9000000001` | H-1024, XYZ Colony, Ward 24 |
| Citizen (abnormal LPG) | `citizen2@savera.demo` | H-1088, ABC Colony, Ward 24 |
| Supervisor | `supervisor@savera.demo` | Ward 24 |
| Gov — Electricity Dept | `electricity@savera.demo` | City |
| Gov — Water Supply Board | `water@savera.demo` | City |
| Gov — LPG Distribution Cell | `gas@savera.demo` | City |

The header role switcher swaps accounts instantly. "Reset demo data" reseeds localStorage.

## Project structure

See `docs/ARCHITECTURE.md` §3. Short version: `src/app` routes · `src/components/{ui,savera,layout,charts,maps,twin,voice,features}` · `src/lib/{engine,api,auth,voice,explain}` · `src/data/{catalogue,geo,fixtures,seed}` · `src/stores` · `src/types`.

## Conventions

- Portal pages are `'use client'`, read via hooks in `src/lib/api/hooks`, write via `api.*` async functions, show skeletons until mounted, toast on every write.
- All numbers come from `src/lib/engine` (pure, deterministic, tested). Never from an LLM. `demoNow` (session store) is the only "today".
- Every derived number renders `<EstimatedChip confidence=… inputs=…>`. Simulated integrations render `<LabelChip kind="simulated" />` or `integration-ready`. Digital twin screens carry `Simulation — Digital Twin Prototype`.
- AI copy never asserts a physical cause: "possible contributors", "possible cause — further inspection may be required", "possible supply-demand gap", "possible leakage — check for safety", "may reduce".
- Supervisor/gov screens show aggregates only, never a household id or name.
- Status tones: optimal=cyan, normal=emerald, moderate=amber, critical=red, unknown=grey — always with a label/icon.
- Indian formatting via `src/lib/format.ts` (`₹3,120`, `4,50,000 L`, `14.2 kg`).
- No "coming soon", "TODO", lorem ipsum or placeholder screens in the UI.
- Theme: dark `#050B08` / `#0A0F0D` surfaces, emerald primary, Outfit display + Inter body, glass cards, pill buttons. Light theme supported via `next-themes`.
- Shared foundation folders (`types`, `stores`, `lib/engine`, `lib/api`, `components/ui|savera|layout|charts|maps`, `data`) are frozen after Phase 0 — add new files rather than editing them when building features in parallel.
