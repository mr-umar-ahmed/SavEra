"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AlertCard } from "@/components/cards/alert-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { markAllAlertsRead } from "@/lib/endpoints";
import { formatDate, parseApiDate, toApiDate } from "@/lib/format";
import type { Alert } from "@/lib/types";

/** "Today" / "Yesterday" / "12 Aug 2026" — the heading over each day's group. */
export function dayHeading(iso: string, today: Date = new Date()): string {
  const day = toApiDate(new Date(iso));
  const todayKey = toApiDate(today);
  const yesterdayKey = toApiDate(new Date(today.getTime() - 86_400_000));
  if (day === todayKey) return "Today";
  if (day === yesterdayKey) return "Yesterday";
  return formatDate(day);
}

/** Groups alerts into day buckets, newest day first, preserving order within a day. */
export function groupByDay(alerts: Alert[], today: Date = new Date()): [string, Alert[]][] {
  const groups = new Map<string, Alert[]>();
  for (const alert of alerts) {
    const key = toApiDate(new Date(alert.created_at));
    const bucket = groups.get(key);
    if (bucket) bucket.push(alert);
    else groups.set(key, [alert]);
  }
  return [...groups.entries()]
    .sort((a, b) => parseApiDate(b[0]).getTime() - parseApiDate(a[0]).getTime())
    .map(([, items]) => [dayHeading(items[0]!.created_at, today), items]);
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const call = useApi();
  const [busy, setBusy] = useState(false);
  const unread = alerts.filter((alert) => !alert.is_read).length;

  async function readAll() {
    setBusy(true);
    try {
      const { updated } = await call((ctx) => markAllAlertsRead(ctx));
      toast.success(updated > 0 ? `Marked ${updated} as read` : "Nothing left to mark");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not mark those as read."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {unread > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {unread} unread — tap one to mark it read.
          </p>
          <Button variant="outline" className="touch-target" disabled={busy} onClick={readAll}>
            {busy ? <Spinner /> : <CheckCheck aria-hidden />}
            Mark all read
          </Button>
        </div>
      ) : null}

      {groupByDay(alerts).map(([heading, items]) => (
        <section key={heading} className="space-y-2">
          <h2 className="px-1 font-display text-sm font-semibold text-muted-foreground">
            {heading}
          </h2>
          <div className="space-y-2">
            {items.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
