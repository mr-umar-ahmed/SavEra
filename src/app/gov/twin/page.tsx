"use client";

import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { TwinCanvas } from "@/components/twin/TwinCanvas";

export default function GovTwinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="City Simulation & Digital Twin Prototype"
        subtitle="Simulated macro-grid demand response, water distribution pumping loads, and city-scale decarbonization scenarios."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="simulation" label="Simulation Prototype" />
            <span className="text-xs font-mono text-white/50">City of Raichur</span>
          </div>
        }
      />

      <TwinCanvas
        title="Raichur City Grid Simulation"
        subtitle="Simulated real-time interaction between automated demand response and municipal water pump stations."
      />
    </div>
  );
}
