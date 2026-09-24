"use client";

import { PageHeader } from "@/components/savera/PageHeader";
import { TwinCanvas } from "@/components/twin/TwinCanvas";
import { StatusBadge } from "@/components/savera/StatusBadge";

export default function CitizenTwinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Home — Digital Twin Prototype"
        subtitle="Simulated interactive model of household electrical appliances. Adjust setpoints and schedules to simulate real-world grid impact."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="simulation" label="Simulation Prototype" />
            <span className="text-xs font-mono text-white/50">Household H-1024</span>
          </div>
        }
      />

      <TwinCanvas />
    </div>
  );
}
