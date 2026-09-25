"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { aggStatusLabel, aggStatusTone } from "@/types";
import type { LpgAreaRow } from "@/lib/api/hooks/lpg";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIN, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Area-level LPG table (aggregates only — counts, never household ids). */
export function LpgAreaTable({
  rows,
  hrefFor,
  selectedId,
  onSelect,
}: {
  rows: LpgAreaRow[];
  hrefFor?: (areaId: string) => string;
  selectedId?: string | null;
  onSelect?: (areaId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Area</TableHead>
          <TableHead className="text-right">LPG homes</TableHead>
          <TableHead className="text-right">Active</TableHead>
          <TableHead className="text-right">This month</TableHead>
          <TableHead className="text-right">Baseline</TableHead>
          <TableHead className="text-right">vs baseline</TableHead>
          <TableHead>Status</TableHead>
          {hrefFor ? <TableHead className="pr-6 text-right">Details</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const tone = aggStatusTone(r.agg.status);
          const label = aggStatusLabel(r.agg.status, "lpg");
          return (
            <TableRow
              key={r.area.id}
              onClick={onSelect ? () => onSelect(r.area.id) : undefined}
              className={cn(onSelect && "cursor-pointer", selectedId === r.area.id && "bg-muted")}
            >
              <TableCell className="pl-6">
                <span className="text-foreground font-semibold">
                  {r.area.code ? `Area ${r.area.code} · ` : ""}
                  {r.area.name}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatIN(r.agg.totalHouseholds)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatIN(r.agg.activeHouseholds)}</TableCell>
              <TableCell className="text-foreground text-right font-semibold tabular-nums">
                {formatIN(r.agg.totalConsumption)} kg
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatIN(r.agg.baseline)} kg</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{formatPct(r.pctVsBaseline, 1, true)}</TableCell>
              <TableCell>
                <StatusBadge tone={tone} label={label} size="sm" />
              </TableCell>
              {hrefFor ? (
                <TableCell className="pr-6 text-right">
                  <Link
                    href={hrefFor(r.area.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                  >
                    Investigate
                    <ArrowRight className="size-3.5" />
                  </Link>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
