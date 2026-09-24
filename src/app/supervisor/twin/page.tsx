"use client";

import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { TwinCanvas } from "@/components/twin/TwinCanvas";

export default function SupervisorTwinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Simulation & Demand Model"
        subtitle="Simulated digital twin of Ward 24 area blocks, automated demand response impact, and load balancing."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="simulation" label="Ward Simulation Prototype" />
            <span className="text-xs font-mono text-white/50">Ward 24 · 4 Localities</span>
          </div>
        }
      />

      <TwinCanvas
        title="Ward 24 Grid & Habitat Simulation"
        subtitle="Simulated area aggregated loads under active Automated Demand Response protocols."
      />
    </div>
  );
}
