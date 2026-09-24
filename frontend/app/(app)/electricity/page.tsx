import { Zap } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { AddElectricityButton } from "@/components/readings/add-buttons";
import { ElectricityList } from "@/components/readings/reading-lists";
import { withAuth } from "@/lib/api.server";
import { getElectricityReadings } from "@/lib/endpoints";

export const metadata: Metadata = { title: "Electricity" };

/**
 * Your saved bills. Charts, the baseline line and the appliance breakdown join
 * this page in Phase 3; for now it is the record you are building them from.
 */
export default async function ElectricityPage() {
  const readings = await withAuth((ctx) => getElectricityReadings(12, ctx));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Electricity</h1>
          <p className="text-sm text-muted-foreground">
            One entry per billing period, straight off the bill.
          </p>
        </div>
        <AddElectricityButton />
      </header>

      {readings.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No bills yet"
          body="Photograph your latest bill or type in the units — six bills is where the comparisons start to mean something."
          action={<AddElectricityButton label="Add your first bill" />}
        />
      ) : (
        <ElectricityList readings={readings} />
      )}
    </div>
  );
}
