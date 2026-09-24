"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  Send,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function GovCasesPage() {
  const updateWaterCase = useDataStore((s) => s.updateWaterCase);
  const [recorded, setRecorded] = useState(false);

  const handleRecordAction = () => {
    updateWaterCase("case-xyz-001", {
      state: "action_scheduled",
    });
    setRecorded(true);
    toast.success("Department action recorded: Re-balancing schedule broadcast to Ward 24!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Department Cases & Supervisory Escalations"
        subtitle="Review on-ground verified cases forwarded by ward supervisors and execute municipal operational adjustments."
        badge={<StatusBadge status="warning" label="1 Pending Action" />}
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white font-mono text-sm">CASE-XYZ-001</span>
              <StatusBadge status={recorded ? "complete" : "warning"} label={recorded ? "Action Scheduled" : "Escalated by Supervisor"} />
            </div>
            <p className="text-xs text-white/60">Forwarded by Ward 24 Supervisor (Rajesh Gowda)</p>
          </div>
          <span className="text-xs font-mono text-teal-400 font-bold">78 Households Affected</span>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
          <div className="font-semibold text-white">Field Inspection Summary:</div>
          <p className="text-white/70">
            Field Assistant Suresh M (Team 04) conducted physical pressure test at Feeder Line 4B. Manifold pressure observed at 0.8 bar (normal 1.4 bar). Supply duration restricted to 30 mins.
          </p>
        </div>

        {recorded ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Action Scheduled: Feeder 4B booster pump scheduled for tomorrow morning (7:00 AM – 8:15 AM). Affected citizens and ward supervisor notified.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Execute Department Response</h4>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="text-white/80">Proposed Municipal Action:</div>
              <div className="font-semibold text-teal-300">Schedule Feeder Pressure Re-Balancing & Extend Morning Window by 15 mins.</div>
            </div>

            <Button
              onClick={handleRecordAction}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-9 gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Record Action & Notify Community</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
