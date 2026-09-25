"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Cylinder, Flame, Gauge, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import type { GasKind, HouseholdGas, LpgCylinderSize, SetupStatus } from "@/types";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { ChoiceGrid } from "@/components/savera/ChoiceGrid";
import { LabelChip } from "@/components/savera/LabelChip";
import { PageHeader } from "@/components/savera/PageHeader";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { useLpgHousehold } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { formatDate, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";

type KindChoice = GasKind | "none";
type FieldKey = "kind" | "size" | "provider" | "first" | "png";
type FieldState = "open" | "skipped" | "later";

const DEFAULT_PROVIDER = "LPG Distribution Cell (Raichur)";

export default function GasSetupPage() {
  const mounted = useHasMounted();
  const router = useRouter();
  const view = useLpgHousehold();
  const saved = view.household?.gas;

  const [kind, setKind] = React.useState<KindChoice | null>(saved?.kind ?? null);
  const [size, setSize] = React.useState<string>(String(saved?.cylinderSizeKg ?? 14.2));
  const [providerMode, setProviderMode] = React.useState<"cell" | "other">(
    saved && saved.provider !== DEFAULT_PROVIDER && saved.provider !== "LPG Distribution Cell" ? "other" : "cell",
  );
  const [otherProvider, setOtherProvider] = React.useState(
    saved && saved.provider !== DEFAULT_PROVIDER && saved.provider !== "LPG Distribution Cell" ? saved.provider : "",
  );
  const [inUse, setInUse] = React.useState<number>(saved?.cylindersInUse ?? 1);
  const [refillDate, setRefillDate] = React.useState(view.now);
  const [startDate, setStartDate] = React.useState(view.now);
  const [scm, setScm] = React.useState<string>(saved?.pngMonthlyScm ? String(saved.pngMonthlyScm) : "");
  const [bill, setBill] = React.useState<string>(saved?.pngMonthlyBill ? String(saved.pngMonthlyBill) : "");
  const [fields, setFields] = React.useState<Record<FieldKey, FieldState>>({
    kind: "open",
    size: "open",
    provider: "open",
    first: "open",
    png: "open",
  });
  const [busy, setBusy] = React.useState(false);

  if (!mounted) return <LpgSkeleton tiles={2} />;

  const usesLpg = kind === "lpg" || kind === "both";
  const usesPng = kind === "piped" || kind === "both";
  const hasOpenCylinder = !!view.openCylinder;
  const mark = (k: FieldKey, s: FieldState) => setFields((f) => ({ ...f, [k]: s }));
  const provider = providerMode === "cell" ? DEFAULT_PROVIDER : otherProvider.trim() || DEFAULT_PROVIDER;

  const statusOf = (): SetupStatus => {
    if (kind === "none") return "complete";
    if (!kind) return Object.values(fields).some((s) => s === "later") ? "later" : "partial";
    const lpgDone =
      !usesLpg ||
      (fields.size === "open" && fields.provider === "open" && (hasOpenCylinder || fields.first === "open"));
    const pngDone = !usesPng || (fields.png === "open" && (scm !== "" || bill !== ""));
    return lpgDone && pngDone ? "complete" : "partial";
  };

  const save = async (laterAll = false) => {
    setBusy(true);
    const status: SetupStatus = laterAll ? "later" : statusOf();
    const gas: HouseholdGas | undefined =
      kind && kind !== "none" && !laterAll
        ? {
            kind,
            cylinderSizeKg: Number(size) as LpgCylinderSize,
            provider,
            cylindersInUse: usesLpg ? inUse : undefined,
            pngMonthlyScm: usesPng && scm ? Number(scm) : undefined,
            pngMonthlyBill: usesPng && bill ? Number(bill) : undefined,
          }
        : undefined;
    const firstCylinder =
      !laterAll && usesLpg && !hasOpenCylinder && fields.first === "open" && startDate >= refillDate
        ? { refillDate, startDate, sizeKg: Number(size), provider }
        : undefined;
    const res = await lpgApi.saveSetup(view.householdId, { gas, status, firstCylinder });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(laterAll ? "Gas setup saved for later." : "LPG setup saved.", {
      description: res.data.addedCylinder ? `Tracking your cylinder from ${formatDate(res.data.addedCylinder.startDate)}.` : undefined,
    });
    router.push(usesLpg && !laterAll ? "/citizen/gas" : "/citizen");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Setup"
        title="Gas & Heating Setup"
        description="Tell SAVERA how you cook. Every field is optional — skip anything and complete it later."
        breadcrumbs={[{ label: "Habitat Hub", href: "/citizen" }, { label: "Gas & Heating" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Step n={1} title="What do you cook with?" state={fields.kind}>
            <ChoiceGrid
              options={[
                { value: "lpg", label: "LPG cylinder", description: "Refillable domestic cylinders", icon: Cylinder },
                { value: "piped", label: "Piped gas (PNG)", description: "Municipal pipeline, metered", icon: Gauge },
                { value: "both", label: "Both", description: "Cylinder and piped gas", icon: Flame },
                { value: "none", label: "None", description: "Induction / electric only", icon: Ban },
              ]}
              value={kind ?? ""}
              onChange={(v) => {
                setKind(v as KindChoice);
                mark("kind", "open");
              }}
              columns={2}
              label="Gas type"
            />
            <SkipRow onSkip={() => mark("kind", "skipped")} onLater={() => mark("kind", "later")} className="mt-3" />
          </Step>

          {usesLpg ? (
            <>
              <Step n={2} title="Cylinder size and provider" state={fields.size}>
                <ChoiceGrid
                  options={[
                    { value: "5", label: "5 kg", description: "Small / portable" },
                    { value: "14.2", label: "14.2 kg", description: "Standard domestic" },
                    { value: "19", label: "19 kg", description: "Commercial" },
                  ]}
                  value={size}
                  onChange={(v) => {
                    setSize(v);
                    mark("size", "open");
                  }}
                  columns={3}
                  label="Cylinder size"
                />
                <SkipRow
                  onDontKnow={() => {
                    setSize("14.2");
                    toast.info("No problem — SAVERA will assume a standard 14.2 kg cylinder.");
                  }}
                  onSkip={() => mark("size", "skipped")}
                  onLater={() => mark("size", "later")}
                  className="mt-3"
                />

                <div className="border-border mt-6 space-y-3 border-t pt-6">
                  <Label>Provider</Label>
                  <ChoiceGrid
                    options={[
                      { value: "cell", label: DEFAULT_PROVIDER, description: "Generic demo distributor" },
                      { value: "other", label: "Other", description: "Type the distributor name" },
                    ]}
                    value={providerMode}
                    onChange={(v) => {
                      setProviderMode(v as "cell" | "other");
                      mark("provider", "open");
                    }}
                    columns={2}
                    label="Provider"
                  />
                  {providerMode === "other" ? (
                    <Input
                      aria-label="Provider name"
                      placeholder="Distributor name"
                      value={otherProvider}
                      onChange={(e) => setOtherProvider(e.target.value)}
                    />
                  ) : null}
                  <SkipRow onSkip={() => mark("provider", "skipped")} onLater={() => mark("provider", "later")} />
                </div>

                <div className="border-border mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
                  <div>
                    <Label>Cylinders connected at the same time</Label>
                    <p className="text-muted-foreground text-xs">Most homes use one at a time with a spare.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" aria-label="Fewer cylinders" onClick={() => setInUse((n) => Math.max(1, n - 1))}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="font-display text-foreground w-8 text-center text-xl font-bold" aria-live="polite">
                      {inUse}
                    </span>
                    <Button variant="outline" size="icon-sm" aria-label="More cylinders" onClick={() => setInUse((n) => Math.min(3, n + 1))}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </Step>

              <Step n={3} title="Your current cylinder" state={hasOpenCylinder ? "open" : fields.first}>
                {hasOpenCylinder && view.openCylinder ? (
                  <p className="bg-positive-soft border-positive/25 text-positive rounded-xl border px-4 py-3 text-sm font-semibold">
                    Already tracking a {formatKg(view.openCylinder.sizeKg)} cylinder started on{" "}
                    {formatDate(view.openCylinder.startDate)}.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="setup-refill">Refill (delivery) date</Label>
                        <Input
                          id="setup-refill"
                          type="date"
                          value={refillDate}
                          max={view.now}
                          onChange={(e) => {
                            setRefillDate(e.target.value);
                            setStartDate(e.target.value);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setup-start">Start date</Label>
                        <Input
                          id="setup-start"
                          type="date"
                          value={startDate}
                          min={refillDate}
                          max={view.now}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <SkipRow onSkip={() => mark("first", "skipped")} onLater={() => mark("first", "later")} className="mt-3" />
                  </>
                )}
              </Step>
            </>
          ) : null}

          {usesPng ? (
            <Step n={usesLpg ? 4 : 2} title="Piped gas readings" state={fields.png} chip={<LabelChip kind="measured" size="sm" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="png-scm">Last monthly reading (SCM)</Label>
                  <Input id="png-scm" type="number" min={0} step="0.1" inputMode="decimal" placeholder="e.g. 11.5" value={scm} onChange={(e) => setScm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="png-bill">Last monthly bill (₹)</Label>
                  <Input id="png-bill" type="number" min={0} inputMode="numeric" placeholder="e.g. 640" value={bill} onChange={(e) => setBill(e.target.value)} />
                </div>
              </div>
              <SkipRow onSkip={() => mark("png", "skipped")} onLater={() => mark("png", "later")} className="mt-3" />
            </Step>
          ) : null}
        </div>

        <aside className="glass h-fit space-y-4 rounded-2xl p-6 lg:sticky lg:top-28">
          <p className="eyebrow">Summary</p>
          <ul className="space-y-2.5 text-sm">
            <SummaryItem label="Gas type" value={kind ? KIND_LABEL[kind] : "Not set"} done={!!kind} />
            {usesLpg ? (
              <>
                <SummaryItem label="Cylinder" value={fields.size === "open" ? `${size} kg` : "Skipped"} done={fields.size === "open"} />
                <SummaryItem label="Provider" value={fields.provider === "open" ? provider : "Skipped"} done={fields.provider === "open"} />
                <SummaryItem
                  label="Tracking"
                  value={hasOpenCylinder ? "Active" : fields.first === "open" ? `From ${formatDate(startDate)}` : "Later"}
                  done={hasOpenCylinder || fields.first === "open"}
                />
              </>
            ) : null}
            {usesPng ? (
              <SummaryItem label="PNG reading" value={scm ? `${scm} SCM` : "Not added"} done={scm !== "" || bill !== ""} />
            ) : null}
          </ul>
          <p className="text-muted-foreground text-xs">
            Section status on save: <strong className="text-foreground">{STATUS_LABEL[statusOf()]}</strong>. Nothing
            here blocks your dashboards.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => save(false)} disabled={busy} className="gap-2">
              <Save className="size-4" />
              {busy ? "Saving…" : usesLpg ? "Save & open LPG Dashboard" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => save(true)} disabled={busy}>
              Set up later
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<KindChoice, string> = {
  lpg: "LPG cylinder",
  piped: "Piped gas (PNG)",
  both: "LPG + piped gas",
  none: "No cooking gas",
};

const STATUS_LABEL: Record<SetupStatus, string> = {
  complete: "Complete",
  partial: "Partial",
  later: "Set up later",
  none: "Not added",
};

function Step({
  n,
  title,
  state,
  chip,
  children,
}: {
  n: number;
  title: string;
  state: FieldState;
  chip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-6" aria-labelledby={`gas-step-${n}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full font-mono text-sm font-bold">
          {n}
        </span>
        <h2 id={`gas-step-${n}`} className="font-display text-foreground text-lg font-bold">
          {title}
        </h2>
        {chip}
        {state !== "open" ? (
          <span className="bg-secondary text-soft rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {state === "later" ? "Set up later" : "Skipped for now"}
          </span>
        ) : null}
      </div>
      <div className={cn(state !== "open" && "opacity-60")}>{children}</div>
    </section>
  );
}

function SummaryItem({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right font-semibold", done ? "text-foreground" : "text-faint")}>
        {done ? <Check className="text-positive mr-1.5 inline size-3.5 align-[-2px]" aria-label="done" /> : null}
        {value}
      </span>
    </li>
  );
}
