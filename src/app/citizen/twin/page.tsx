"use client";

import Link from "next/link";
import { ArrowLeft, QrCode, Zap } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { TwinCanvas } from "@/components/twin/TwinCanvas";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useSessionStore } from "@/stores/session";

export default function CitizenTwinPage() {
  const user = useSessionStore((s) => s.user);
  const { household } = useCurrentHousehold();
  const currentHouseholdId = household?.id || user?.householdId || "H-1024";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Home — Digital Twin Prototype"
        subtitle="Simulated real-time 3D isometric & schematic model of household electrical appliances. Adjust setpoints and schedules to simulate real-world grid impact."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="simulation" label="Simulation Prototype" />
            <span className="text-xs font-mono text-muted-foreground">
              Household {currentHouseholdId} · {household?.name ?? user?.name ?? "Resident"}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/scan">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border bg-muted hover:bg-secondary text-xs rounded-xl">
                <QrCode className="size-4 text-positive" />
                <span>Scan New Appliance</span>
              </Button>
            </Link>
            <Link href="/citizen/electricity">
              <Button size="sm" className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover text-xs rounded-xl shadow-md shadow-primary/10">
                <Zap className="size-4" />
                <span>Electricity Dashboard</span>
              </Button>
            </Link>
          </div>
        }
      />

      <TwinCanvas householdId={currentHouseholdId} />
    </div>
  );
}
