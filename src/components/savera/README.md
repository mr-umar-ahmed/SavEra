# `@/components/savera` — SAVERA domain components

Developer reference for the domain primitives defined in `docs/ARCHITECTURE.md` §8, plus the
chart wrappers in `@/components/charts` and the map in `@/components/maps`. Everything is built on
the shadcn-style primitives in `@/components/ui` and the shared vocabulary in `@/types`.

Conventions shared by every component:

- `cn()` merges class names; every component accepts `className` and spreads the remaining
  HTML props (so `ref`, `id`, `data-*` and `aria-*` pass through under React 19).
- Status colour is never the only cue: badges carry a label, chips carry text, maps carry a
  legend and a tooltip, charts carry a legend for two or more series.
- Status tones (`Tone`) map to `bg-tone-x/15 text-tone-x border-tone-x/30` via `TONE_CLASSES`;
  streams map to `text-stream-x` via `STREAM_CLASSES`. Class strings are literal so Tailwind v4
  can scan them.
- Components that accept callbacks or use hooks are `"use client"`; the rest are server-safe.

## Chips and labels

| Component        | Use                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `EstimatedChip`  | Mandatory on every derived number. `Estimated · Medium confidence` with a tooltip listing the inputs.           |
| `ConfidenceChip` | Standalone `High / Medium / Low confidence` pill.                                                               |
| `LabelChip`      | `Simulated`, `Integration-ready`, `Simulation`, `Official`, `Demo`, `Live feed (simulated)`, `New`, `Measured`. |
| `StatusBadge`    | Dot + label tinted by tone (`sm` / `md`, optional `pulse`).                                                     |
| `StatusDot`      | Decorative dot only; pair with text.                                                                            |
| `TonePill`       | Tone-tinted pill with optional icon and free text.                                                              |
| `DeltaPill`      | `+11.4 %` coloured by direction; `invert` for lower-is-better metrics.                                          |

```tsx
<EstimatedChip
  confidence={analysis.confidence}
  inputs={[
    { label: "Appliance list", value: "9 appliances" },
    { label: "Bills", value: "3 months" },
    "Area average (Ward 24)",
  ]}
/>

<LabelChip kind="simulated" />
<LabelChip kind="live" />                       // pulsing dot + "Live feed (simulated)"
<StatusBadge tone="moderate" label="Higher than baseline" />
<DeltaPill value={11.4} invert context="vs last month" />   // red: consumption went up
<DeltaPill value={4} unit="points" />                        // green: score went up
```

## Layout and cards

| Component                    | Use                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PageHeader`                 | Eyebrow, display title, description, chips row, actions, optional back link.                                      |
| `SectionCard`                | Glass card with icon tile, title, description, actions; `tone` tints it; `flush` removes padding for tables/maps. |
| `KpiCard`                    | Glass KPI tile: label, big value, sub line, tinted icon, `DeltaPill`, `EstimatedChip`.                            |
| `NumberStat`                 | Big number + unit + caption (no card).                                                                            |
| `EmptyState`                 | Icon, title, description and a concrete next action (`href` or `onClick`).                                        |
| `DefinitionList` / `CopyRow` | Label / value rows (`columns`, `layout="stack"`, `dense`).                                                        |
| `Breadcrumbs`                | Top-bar trail with `aria-current="page"` on the last item.                                                        |

```tsx
<PageHeader
  eyebrow="Electricity"
  title="This month at a glance"
  description="Estimates are based on your appliance list and the bills you have added."
  chips={<><LabelChip kind="demo" /><EstimatedChip confidence="Medium" /></>}
  actions={<Button>Add bill</Button>}
  backHref="/citizen"
/>

<KpiCard
  label="Forecast next month"
  value={formatRange(405, 430, "kWh")}
  sub={formatRangeINR(3250, 3500)}
  icon={Zap}
  tone="moderate"
  delta={{ value: 6.2, invert: true, context: "vs this month" }}
  estimated
  confidence="Medium"
  inputs={["Last 3 bills", "Seasonal factor (Oct)", "Area trend"]}
/>

<SectionCard title="Appliance breakdown" description="Estimated share of monthly kWh." icon={Gauge}
  actions={<EstimatedChip confidence="Medium" size="sm" />}>
  <DonutChart data={slices} centerValue="365" centerLabel="kWh est." unit="kWh" />
</SectionCard>

<DefinitionList
  items={[
    { label: "Connection", value: "Domestic · 3 kW" },
    { label: "Tariff", value: "Demo tariff", chip: <LabelChip kind="demo" size="sm" /> },
  ]}
/>
```

## Flow and input helpers

| Component        | Use                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `StatusTimeline` | Vertical steps (`TimelineStep[]`): done = emerald check, active = pulsing amber, pending = grey; shows `at` and `note`.      |
| `ChoiceGrid`     | Selectable option cards, single (`radiogroup`) or `multiple` (`group`), arrow-key navigation.                                |
| `SkipRow`        | `Don't know · Skip for now · Set up later` ghost buttons (never block the user).                                             |
| `DemoControl`    | Presenter-only dashed amber button with a `Demo` badge and loading state.                                                    |
| `InfoTooltip`    | Small "i" button revealing explanatory text.                                                                                 |
| `RangeBar`       | A value marker against a low–high band (baseline bands).                                                                     |
| `ProgressRing`   | SVG ring for completeness percentages (`role="progressbar"`).                                                                |
| `AlertBanner`    | Official disruption alert (`OfficialAlert`): `Official` chip, stream icon, title, window, reason, status; `compact` variant. |
| `StreamIcon`     | Zap / Droplets / Flame in the stream colour; `variant="tile"` for a tinted square.                                           |

```tsx
<ChoiceGrid
  label="Household size"
  options={[
    { value: "1-2", label: "1–2 people" },
    { value: "3-4", label: "3–4 people", description: "Most common in Ward 24" },
    { value: "5+", label: "5 or more" },
  ]}
  value={size}
  onChange={setSize}
  columns={3}
/>

<ChoiceGrid multiple options={applianceOptions} value={selected} onChange={setSelected} />

<SkipRow onDontKnow={() => setValue(null)} onSkip={next} onLater={markLater} />

<DemoControl
  label="Simulate field update"
  description="Advances the field verification by one step."
  onClick={simulateFieldUpdate}
  loading={pending}
/>

<StatusTimeline steps={caseTimeline(waterCase)} />
<RangeBar value={390} low={320} high={350} unit="kWh" valueLabel="This month" bandLabel="Baseline band" />
<ProgressRing value={72} label="Setup complete" tone="moderate" />
<AlertBanner alert={alert} href={`/citizen/alerts/${alert.id}`} />
```

Helpers exported alongside the components: `streamTone(stream)`, `streamLabel(stream)`,
`streamColor(stream)`, `STREAM_ICON`, `TONE_CLASSES`, `TONE_HEX`, `STREAM_CLASSES`, `STREAM_HEX`,
`toneClasses(tone)`, `toneHex(tone)`, `ALERT_STATUS_TONE`, `ALERT_STATUS_LABEL`, `formatAlertWindow`.

## Charts (`@/components/charts`)

All wrappers are `"use client"`, `ResponsiveContainer`-based, use the themed `ChartTooltip`, follow
`useChartTheme()` (flips with `next-themes`) and skip animation under `prefers-reduced-motion`.

| Component            | Props (key ones)                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TrendAreaChart`     | `data: { x, y, y2? }[]`, `series: { key, label, color, dashed? }[]`, `unit`, `referenceLines: { y, label }[]`, `formatX` |
| `CompareBarChart`    | `data: { name, prev, curr }[]`, `labels: { prev, curr }`, `unit`, `color`, `layout`                                      |
| `DonutChart`         | `data: { name, value, color }[]`, `centerLabel`, `centerValue`, `unit`, `showList`                                       |
| `HistogramChart`     | `bins: { label, count, color? }[]`, `countLabel`                                                                         |
| `LiveDemandChart`    | `series: { t, mw }[]` — animated area, y domain hugs the data, no dots                                                   |
| `RangeBandChart`     | `data: { x, actual?, low, high }[]`, `unit` — band + actual line                                                         |
| `SparkLine`          | `values: number[]`, `color`, `height`                                                                                    |
| `ForecastRangeChart` | `history: { x, y }[]`, `forecast: { x, low, point, high }`                                                               |

```tsx
<TrendAreaChart
  data={months.map((m) => ({ x: m.month, y: m.kwh, y2: m.areaAvg }))}
  series={[
    { key: "y", label: "Your home", color: streamColor("electricity") },
    { key: "y2", label: "Area average", color: CHART.secondary, dashed: true },
  ]}
  unit="kWh"
  referenceLines={[{ y: baseline.mid, label: "Baseline" }]}
  formatX={formatMonth}
/>

<ForecastRangeChart history={history} forecast={{ x: "2026-10", low: 405, point: 418, high: 430 }} unit="kWh" formatX={formatMonth} />
```

Theme access: `import { CHART, CHART_LIGHT, useChartTheme, gradientDefs } from "@/components/charts"`.
`gradientDefs(id, color)` returns `{ id, fill, stops }`; render it with `<ChartDefs gradients={[spec]} />`.

## Map (`@/components/maps`)

`AreaMap` dynamic-imports `AreaMapInner` (react-leaflet, `ssr: false`) behind a skeleton.

```tsx
<AreaMap
  height={380}
  features={areas.map((a) => ({
    id: a.id,
    name: a.name,
    polygon: a.polygon,
    tone: aggStatusTone(a.status),
    label: aggStatusLabel(a.status, "water"),
    value: formatLitres(a.suppliedLitres),
  }))}
  selectedId={selected}
  onSelect={setSelected}
  legend={[
    { tone: "normal", label: "Normal" },
    { tone: "moderate", label: "Higher than baseline" },
    { tone: "critical", label: "Significantly higher" },
  ]}
  markers={[
    {
      id: "fa-ravi",
      position: [16.21, 77.35],
      tone: "moderate",
      label: "Field team",
      value: "Verifying",
    },
  ]}
/>
```

Tiles are OpenStreetMap; in dark mode `map.css` inverts the tile pane so the map sits on the
`#050B08` surface. Point markers use `CircleMarker`, so the default Leaflet icon assets are never
needed. Colour is paired with the legend, the tooltip label and a visually-hidden list of areas.

## Hooks (`@/components/hooks`)

- `useHasMounted()` — `true` after the client mount; render skeletons while `false`.
- `useReducedMotion()` — `prefers-reduced-motion` media query, `false` on the server.
