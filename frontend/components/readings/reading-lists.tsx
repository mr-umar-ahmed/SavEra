"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { deleteElectricityReading, deleteWaterReading } from "@/lib/endpoints";
import { formatDate, formatNumber, formatPeriod, formatRupees } from "@/lib/format";
import type { ElectricityReading, WaterReading } from "@/lib/types";

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="touch-target text-muted-foreground hover:text-bad-fg"
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onDelete();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner /> : <Trash2 aria-hidden />}
    </Button>
  );
}

/** Saved bills, newest period first, with the 30-day figure that makes them comparable. */
export function ElectricityList({ readings }: { readings: ElectricityReading[] }) {
  const router = useRouter();
  const call = useApi();

  async function remove(reading: ElectricityReading) {
    try {
      await call((ctx) => deleteElectricityReading(reading.id, ctx));
      toast.success("Bill deleted");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not delete that bill."));
    }
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {readings.map((reading) => (
        <li key={reading.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold tabular-nums">
              {formatNumber(reading.kwh)}
              <span className="ml-1 text-sm font-semibold text-muted-foreground">kWh</span>
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {formatPeriod(reading.billing_period_start, reading.billing_period_end)}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {formatNumber(reading.kwh_per_30d)} kWh per 30 days
              </span>
              {reading.billed_amount != null ? (
                <span className="tabular-nums">· {formatRupees(reading.billed_amount)}</span>
              ) : null}
              {reading.source === "ocr" ? (
                <Badge variant="outline" className="gap-1">
                  <Camera className="size-3" aria-hidden />
                  From a photo
                </Badge>
              ) : null}
            </p>
          </div>
          <DeleteButton
            label={`Delete the bill for ${formatPeriod(reading.billing_period_start, reading.billing_period_end)}`}
            onDelete={() => remove(reading)}
          />
        </li>
      ))}
    </ul>
  );
}

/** Daily water readings, newest first. */
export function WaterList({ readings }: { readings: WaterReading[] }) {
  const router = useRouter();
  const call = useApi();

  async function remove(reading: WaterReading) {
    try {
      await call((ctx) => deleteWaterReading(reading.id, ctx));
      toast.success("Reading deleted");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not delete that reading."));
    }
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {readings.map((reading) => (
        <li key={reading.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium tabular-nums">
              {formatNumber(reading.liters)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">L</span>
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {formatDate(reading.reading_date)}
            </p>
          </div>
          <DeleteButton
            label={`Delete the reading for ${formatDate(reading.reading_date)}`}
            onDelete={() => remove(reading)}
          />
        </li>
      ))}
    </ul>
  );
}
