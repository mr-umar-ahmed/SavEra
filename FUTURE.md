# FUTURE.md — ideas deliberately not built in the MVP

Everything here was raised during planning or building but is outside `docs/SPEC.md`.
Nothing on this list ships until it is promoted into the spec.

## Product
- More BEE appliance types (microwave, induction cooktop, water pump, mixer-grinder, air cooler, iron, lighting, inverter losses) — needs a schema CHECK change and UI chips.
- Free-text label for the `other` appliance type.
- PDF bill uploads (pypdf text layer + GCV `files:annotate`) and HEIC (pillow-heif).
- Persist OCR raw text / confidence per saved reading for label-table tuning.
- Supervisor ↔ ward mapping table (`supervisor_wards`); MVP scopes supervisors to all wards in their city.
- Put the app role in the JWT via a Supabase Custom Access Token Hook so `proxy.ts` can gate `/supervisor` before the API 403.
- Weekly digest by email; milestone badges/streaks; per-person peer comparison as the default view.
- AMI / smart-meter ingestion (`source='ami'` is reserved in the schema).

## Platform
- Supabase Storage bucket for bill images with signed URLs (MVP stores JPEGs under `UPLOAD_DIR` and serves them through an owner-checked route).
- Offline PWA caching with Serwist (`@serwist/turbopack`); MVP ships manifest + viewport only.
- Frontend Dockerfile / compose service; deployment recipes (Vercel + Render/Fly).
- pytest-xdist (needs per-worker test DBs; TimescaleDB caps background workers at 16).
- Rate limiting on upload and reading endpoints.
- Node 22/24 LTS on the dev machine → Vitest 5 / jsdom 30.
