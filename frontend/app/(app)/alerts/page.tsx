import { BellOff } from "lucide-react";
import type { Metadata } from "next";

import { AlertList } from "@/components/alerts/alert-list";
import { EmptyState } from "@/components/common/empty-state";
import { withAuth } from "@/lib/api.server";
import { getAlerts } from "@/lib/endpoints";

export const metadata: Metadata = { title: "Alerts" };

/**
 * Everything SAVERA has told this household, newest first and grouped by day. Alerts are
 * written only by the background pipeline and the scheduled jobs; this page reads and
 * acknowledges them.
 */
export default async function AlertsPage() {
  const alerts = await withAuth((ctx) => getAlerts({ limit: 100 }, ctx));

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          What changed, why it probably changed, and what to try.
        </p>
      </header>

      {alerts.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nothing to flag"
          body="We will tell you when a bill or a day's water use comes in above your usual — and when your cylinder is close to empty."
        />
      ) : (
        <AlertList alerts={alerts} />
      )}
    </div>
  );
}
