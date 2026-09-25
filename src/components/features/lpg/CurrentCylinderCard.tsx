"use client";

import Link from "next/link";
import { ArrowRight, Cylinder } from "lucide-react";

import type { LpgAnalysis, LpgCylinder } from "@/types";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { ProgressRing } from "@/components/savera/ProgressRing";
import { Button } from "@/components/ui/button";
import { formatDate, formatDays, formatKg } from "@/lib/format";

import { lpgStatusTone } from "./LpgInsightCard";

/** Current cylinder: measured dates + estimated remaining gas (spec 03 §2). */
export function CurrentCylinderCard({
  analysis,
  cylinder,
  usedPct,
}: {
  analysis: LpgAnalysis;
  cylinder: LpgCylinder;
  usedPct: number;
}) {
  const current = analysis.current;
  const tone = usedPct >= 85 ? "critical" : lpgStatusTone(analysis) === "unknown" ? "normal" : lpgStatusTone(analysis);

  return (
    <section className="glass flex flex-col gap-5 rounded-2xl p-6" aria-labelledby="lpg-current-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Cylinder className="size-3.5" aria-hidden="true" />
            Current cylinder
          </p>
          <h2 id="lpg-current-title" className="font-display text-foreground mt-2 text-3xl font-extrabold">
            {formatKg(cylinder.sizeKg)}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{cylinder.provider}</p>
        </div>
        <ProgressRing
          value={usedPct}
          size={112}
          strokeWidth={10}
          tone={tone}
          label="used (est.)"
          ariaLabel={`About ${usedPct} percent of the cylinder used (estimated)`}
        />
      </div>

      <dl className="divide-border border-border divide-y rounded-xl border">
        <Row label="Started" value={formatDate(cylinder.startDate)} chip={<LabelChip kind="measured" size="sm" />} />
        <Row label="Refilled" value={formatDate(cylinder.refillDate)} chip={<LabelChip kind="measured" size="sm" />} />
        {current ? (
          <>
            <Row label="Days used" value={formatDays(current.daysUsed)} />
            <Row
              label="Gas remaining"
              value={`~${formatKg(current.estimatedRemainingKg)} · ~${formatDays(current.estimatedRemainingDays)}`}
              chip={<EstimatedChip confidence={analysis.confidence} inputs={analysis.inputs} size="sm" />}
            />
          </>
        ) : null}
      </dl>

      <Button asChild className="mt-auto w-full gap-2">
        <Link href="/citizen/gas/cylinder">
          Update Cylinder
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}

function Row({ label, value, chip }: { label: string; value: string; chip?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-foreground flex flex-wrap items-center justify-end gap-2 text-sm font-semibold">
        {value}
        {chip}
      </dd>
    </div>
  );
}
