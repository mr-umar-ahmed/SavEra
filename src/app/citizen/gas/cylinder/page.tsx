"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Cylinder, Flag, Info, Plus } from "lucide-react";
import { toast } from "sonner";

import type { LpgCylinderSize } from "@/types";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { ChoiceGrid } from "@/components/savera/ChoiceGrid";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { useLpgHousehold } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { daysBetween } from "@/lib/dates";
import { formatDate, formatDays, formatKg } from "@/lib/format";

const SIZE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "5", label: "5 kg", description: "Small / portable" },
  { value: "14.2", label: "14.2 kg", description: "Standard domestic" },
  { value: "19", label: "19 kg", description: "Commercial" },
];

const DEFAULT_PROVIDER = "LPG Distribution Cell (Raichur)";

export default function UpdateCylinderPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <React.Suspense fallback={<LpgSkeleton tiles={2} />}>
      <UpdateCylinderView />
    </React.Suspense>
  );
}

function UpdateCylinderView() {
  const mounted = useHasMounted();
  const router = useRouter();
  const params = useSearchParams();
  const view = useLpgHousehold();
  const { openCylinder, analysis, householdId, now } = view;

  const [tab, setTab] = React.useState<string>(params.get("tab") === "finish" ? "finish" : "add");
  const [size, setSize] = React.useState<string>(String(view.household?.gas?.cylinderSizeKg ?? 14.2));
  const [refillDate, setRefillDate] = React.useState<string>(now);
  const [startDate, setStartDate] = React.useState<string>(now);
  const [startTouched, setStartTouched] = React.useState(false);
  const [providerMode, setProviderMode] = React.useState<"cell" | "other">("cell");
  const [otherProvider, setOtherProvider] = React.useState("");
  const [finishDate, setFinishDate] = React.useState<string>(now);
  const [busy, setBusy] = React.useState(false);
  const [finishedNote, setFinishedNote] = React.useState<string | null>(null);

  if (!mounted) return <LpgSkeleton tiles={2} />;

  const provider = providerMode === "cell" ? DEFAULT_PROVIDER : otherProvider.trim();
  const finishDays = openCylinder ? Math.max(1, daysBetween(openCylinder.startDate, finishDate)) : 0;
  const finishRate = openCylinder && finishDays > 0 ? openCylinder.sizeKg / finishDays : 0;
  const addError =
    !refillDate || !startDate
      ? "Choose the refill and start dates."
      : startDate < refillDate
        ? "The start date cannot be before the refill date."
        : startDate > now
          ? "The start date cannot be in the future."
          : providerMode === "other" && !provider
            ? "Enter the provider name."
            : openCylinder && finishDate < openCylinder.startDate
              ? "The finish date cannot be before the current cylinder started."
              : null;

  const addCylinder = async () => {
    if (addError) {
      toast.error(addError);
      return;
    }
    setBusy(true);
    const res = await lpgApi.addCylinder({
      householdId,
      sizeKg: Number(size),
      refillDate,
      startDate,
      provider,
      finishOpenOn: openCylinder ? finishDate : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const finished = res.data.finished;
    toast.success(`New cylinder added — tracking from ${formatDate(startDate)}.`, {
      description: finished
        ? `Previous cylinder finished after ${formatDays(finished.days)} — ${finished.kgPerDay.toFixed(2)} kg/day.`
        : undefined,
    });
    router.push("/citizen/gas");
  };

  const markFinished = async () => {
    if (!openCylinder) return;
    if (finishDate < openCylinder.startDate) {
      toast.error("The finish date cannot be before the cylinder started.");
      return;
    }
    setBusy(true);
    const res = await lpgApi.finishCurrent(householdId, finishDate);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const msg = `Cylinder finished after ${formatDays(res.data.days)} — ${res.data.kgPerDay.toFixed(2)} kg/day.`;
    toast.success(msg, { description: "Your typical rate has been recalculated." });
    setFinishedNote(msg);
    setTab("add");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LPG"
        title="Update Cylinder"
        description="Record a new cylinder or mark the one in use as finished. Dates you enter are measured values; rates are estimated from them."
        breadcrumbs={[{ label: "LPG", href: "/citizen/gas" }, { label: "Update Cylinder" }]}
      />

      {finishedNote ? (
        <div className="bg-positive-soft border-positive/30 text-positive flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {finishedNote} New typical rate:{" "}
            {analysis.typicalKgPerDay ? `${analysis.typicalKgPerDay.toFixed(2)} kg/day` : "—"}.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tabs value={tab} onValueChange={setTab} className="lg:col-span-2">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="add">
              <Plus className="size-4" />
              Add new cylinder
            </TabsTrigger>
            <TabsTrigger value="finish" disabled={!openCylinder}>
              <Flag className="size-4" />
              Mark current as finished
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="glass mt-2 space-y-6 rounded-2xl p-6">
            <div>
              <Label className="mb-3 block">Cylinder size</Label>
              <ChoiceGrid
                options={SIZE_OPTIONS}
                value={size}
                onChange={(v) => setSize(v)}
                columns={3}
                label="Cylinder size"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="refill-date">Refill (delivery) date</Label>
                <Input
                  id="refill-date"
                  type="date"
                  value={refillDate}
                  max={now}
                  onChange={(e) => {
                    setRefillDate(e.target.value);
                    if (!startTouched) setStartDate(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start (connected) date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  min={refillDate}
                  max={now}
                  onChange={(e) => {
                    setStartTouched(true);
                    setStartDate(e.target.value);
                  }}
                />
                <p className="text-muted-foreground text-xs">Defaults to the refill date.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Provider</Label>
              <ChoiceGrid
                options={[
                  { value: "cell", label: DEFAULT_PROVIDER, description: "Generic demo distributor" },
                  { value: "other", label: "Other", description: "Type the distributor name" },
                ]}
                value={providerMode}
                onChange={(v) => setProviderMode(v as "cell" | "other")}
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
            </div>

            {openCylinder ? (
              <div className="border-tone-moderate/35 bg-tone-moderate/10 space-y-3 rounded-2xl border p-4">
                <p className="text-foreground flex items-start gap-2 text-sm font-semibold">
                  <Info className="text-tone-moderate mt-0.5 size-4 shrink-0" />
                  Mark the current cylinder as finished first?
                </p>
                <p className="text-soft text-sm">
                  Your {formatKg(openCylinder.sizeKg)} cylinder started on {formatDate(openCylinder.startDate)} is
                  still in use. It will be marked finished on the date below before the new one is added.
                </p>
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="finish-before-add">Finish date of current cylinder</Label>
                  <Input
                    id="finish-before-add"
                    type="date"
                    value={finishDate}
                    min={openCylinder.startDate}
                    max={now}
                    onChange={(e) => setFinishDate(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {addError ? <p className="text-tone-critical text-sm">{addError}</p> : null}

            <Button onClick={addCylinder} disabled={busy || !!addError} className="gap-2">
              <Plus className="size-4" />
              {busy ? "Saving…" : openCylinder ? "Finish and add" : "Add cylinder"}
            </Button>
          </TabsContent>

          <TabsContent value="finish" className="glass mt-2 space-y-6 rounded-2xl p-6">
            {openCylinder ? (
              <>
                <div className="bg-muted border-border grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
                  <Summary label="Cylinder" value={formatKg(openCylinder.sizeKg)} />
                  <Summary label="Started" value={formatDate(openCylinder.startDate)} chip={<LabelChip kind="measured" size="sm" />} />
                  <Summary label="Provider" value={openCylinder.provider} />
                </div>
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="finish-date">Finish date</Label>
                  <Input
                    id="finish-date"
                    type="date"
                    value={finishDate}
                    min={openCylinder.startDate}
                    max={now}
                    onChange={(e) => setFinishDate(e.target.value)}
                  />
                </div>
                <p className="text-soft text-sm">
                  This cylinder will have lasted <strong className="text-foreground">{formatDays(finishDays)}</strong>{" "}
                  — about <strong className="text-foreground">{finishRate.toFixed(2)} kg/day</strong>.
                </p>
                <Button onClick={markFinished} disabled={busy} className="gap-2">
                  <Flag className="size-4" />
                  {busy ? "Saving…" : "Mark finished"}
                </Button>
              </>
            ) : (
              <p className="text-soft text-sm">No cylinder is in use right now — add one on the first tab.</p>
            )}
          </TabsContent>
        </Tabs>

        <aside className="glass h-fit space-y-4 rounded-2xl p-6">
          <p className="eyebrow flex items-center gap-2">
            <Cylinder className="size-3.5" aria-hidden="true" />
            Your pattern
          </p>
          <div>
            <p className="text-muted-foreground text-sm">Typical consumption</p>
            <p className="font-display text-foreground text-2xl font-extrabold">
              {analysis.typicalKgPerDay ? `${analysis.typicalKgPerDay.toFixed(2)} kg/day` : "Not learned yet"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Typical cylinder life</p>
            <p className="font-display text-foreground text-2xl font-extrabold">
              {analysis.typicalDaysPerCylinder ? formatDays(analysis.typicalDaysPerCylinder) : "—"}
            </p>
          </div>
          <EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} size="sm" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Typical values are the median of your finished cylinders. Each finished cylinder improves the
            estimate.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Summary({ label, value, chip }: { label: string; value: string; chip?: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-2xs tracking-wider uppercase">{label}</p>
      <p className="text-foreground mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
        {value}
        {chip}
      </p>
    </div>
  );
}
