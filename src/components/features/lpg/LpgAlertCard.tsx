"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, MessageSquarePlus, Search } from "lucide-react";
import { toast } from "sonner";

import { aggStatusTone } from "@/types";
import type { LpgAreaRow } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { LPG_ALERT_STATUS_LABEL, useLpgOpsStore } from "@/stores/lpgOps";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatIN, formatMonth, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** AI note for an above-baseline area — possibilities only, area level only. */
export const LPG_AREA_AI_NOTE =
  "Consumption in this area is above its historical baseline. Possible contributors: seasonal cooking patterns, occupancy changes, or supply timing. Field inquiry may be considered.";

/** AI alert card with the supervisor workflow (spec 03 §10.5). */
export function LpgAlertCard({
  row,
  wardId,
  showLink = true,
  className,
}: {
  row: LpgAreaRow;
  wardId: string;
  showLink?: boolean;
  className?: string;
}) {
  const ops = useLpgOpsStore((s) => s.areas[row.area.id]);
  const status = ops?.status ?? "open";
  const notes = ops?.notes ?? [];
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const tone = aggStatusTone(row.agg.status);
  const areaLabel = `${row.area.code ? `Area ${row.area.code} ` : ""}(${row.area.name})`;

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (res.ok) toast.success(success);
    else toast.error(res.error ?? "Something went wrong");
  };

  return (
    <article
      className={cn(
        "glass flex flex-col gap-4 rounded-2xl p-6",
        status === "resolved" ? "opacity-80" : tone === "critical" ? "border-tone-critical/35" : "border-tone-moderate/35",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border",
              tone === "critical"
                ? "bg-tone-critical/10 border-tone-critical/30 text-tone-critical"
                : "bg-tone-moderate/10 border-tone-moderate/30 text-tone-moderate",
            )}
            aria-hidden="true"
          >
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-foreground text-lg font-bold">
              ⚠️ High LPG Consumption — {areaLabel}
            </h3>
            <p className="text-muted-foreground text-sm">AI-grouped aggregate alert · {formatMonth(row.agg.month)}</p>
          </div>
        </div>
        <StatusBadge
          tone={status === "resolved" ? "normal" : status === "open" ? tone : "optimal"}
          label={LPG_ALERT_STATUS_LABEL[status]}
          size="sm"
        />
      </div>

      <dl className="bg-muted border-border grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-5">
        <Fact label="Current" value={`${formatIN(row.agg.totalConsumption)} kg`} />
        <Fact label="Baseline" value={`${formatIN(row.agg.baseline)} kg`} />
        <Fact label="Change" value={formatPct(row.pctVsBaseline, 1, true)} emphasis />
        <Fact label="Homes affected" value={formatIN(row.agg.aboveBaselineHouseholds)} hint="count only" />
        <Fact
          label="Trend"
          value={row.risingMonths > 0 ? "Increasing" : "Stable"}
          hint={row.risingMonths > 0 ? `${row.risingMonths} month${row.risingMonths === 1 ? "" : "s"}` : undefined}
        />
      </dl>

      <p className="text-soft text-sm leading-relaxed">
        <span className="text-foreground font-semibold">AI note: </span>
        {LPG_AREA_AI_NOTE}
      </p>

      {notes.length > 0 ? (
        <ul className="border-border space-y-2 border-l-2 pl-4">
          {notes.map((n) => (
            <li key={n.id} className="text-sm">
              <span className="text-foreground">{n.text}</span>
              <span className="text-muted-foreground ml-2 text-xs">{formatDateTime(n.at)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {noteOpen ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Supervisor note"
            placeholder="E.g. Discussed with distributor; festival week bookings expected."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                run(
                  "note",
                  async () => {
                    const r = await lpgApi.addNote(row.area.id, note);
                    if (r.ok) {
                      setNote("");
                      setNoteOpen(false);
                    }
                    return r;
                  },
                  "Note added",
                )
              }
            >
              Save note
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {status !== "resolved" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={busy !== null || status === "monitoring"}
              onClick={() => run("monitor", () => lpgApi.markForMonitoring(row.area.id), `${row.area.name} marked for monitoring`)}
            >
              <Eye className="size-4" />
              Mark for monitoring
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={busy !== null || status === "inquiry_requested"}
              onClick={() =>
                run(
                  "inquiry",
                  () => lpgApi.requestFieldInquiry(row.area.id, row.area.name, wardId),
                  "Field inquiry requested — LPG Distribution Cell notified",
                )
              }
            >
              <Search className="size-4" />
              Request field inquiry
            </Button>
            <Button size="sm" variant="ghost" className="gap-2" onClick={() => setNoteOpen((o) => !o)}>
              <MessageSquarePlus className="size-4" />
              Add note
            </Button>
            {status !== "open" ? (
              <Button
                size="sm"
                variant="positive"
                className="gap-2"
                disabled={busy !== null}
                onClick={() => run("resolve", () => lpgApi.resolveAlert(row.area.id), "Alert resolved")}
              >
                <CheckCircle2 className="size-4" />
                Mark resolved
              </Button>
            ) : null}
          </>
        ) : null}
        {showLink ? (
          <Link
            href={`/supervisor/gas/areas/${row.area.id}`}
            className="text-primary ml-auto inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            Area details
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value, hint, emphasis }: { label: string; value: string; hint?: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground font-mono text-2xs tracking-wider uppercase">{label}</dt>
      <dd className={cn("font-display mt-1 text-base font-bold", emphasis ? "text-tone-critical" : "text-foreground")}>
        {value}
      </dd>
      {hint ? <dd className="text-muted-foreground text-xs">{hint}</dd> : null}
    </div>
  );
}
