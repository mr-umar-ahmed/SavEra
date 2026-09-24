import { Droplets } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { AddWaterButton } from "@/components/readings/add-buttons";
import { WaterList } from "@/components/readings/reading-lists";
import { withAuth } from "@/lib/api.server";
import { getWaterReadings } from "@/lib/endpoints";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Water" };

/** Daily litres for the last three months. */
export default async function WaterPage() {
  const readings = await withAuth((ctx) => getWaterReadings(90, ctx));
  const average =
    readings.length > 0
      ? readings.reduce((total, reading) => total + reading.liters, 0) / readings.length
      : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Water</h1>
          <p className="text-sm text-muted-foreground">
            {average === null
              ? "One figure a day, in litres."
              : `About ${formatNumber(average)} L a day across ${readings.length} logged days.`}
          </p>
        </div>
        <AddWaterButton />
      </header>

      {readings.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="No readings yet"
          body="Log today's litres from your tank, meter or tanker delivery. Two weeks of days is enough for us to notice a leak."
          action={<AddWaterButton label="Log today" />}
        />
      ) : (
        <WaterList readings={readings} />
      )}
    </div>
  );
}
