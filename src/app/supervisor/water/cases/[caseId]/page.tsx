"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Droplet,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function SupervisorCaseWorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const updateWaterCase = useDataStore((s) => s.updateWaterCase);

  const [state, setState] = useState<"under_review" | "verification_in_progress" | "verified" | "forwarded">("under_review");
  const [selectedAssistant, setSelectedAssistant] = useState("Suresh M (Team 04)");
  const [simulating, setSimulating] = useState(false);

  const handleAssign = () => {
    setState("verification_in_progress");
    updateWaterCase(caseId, {
      state: "verification_in_progress",
    });
    toast.success(`Case assigned to ${selectedAssistant}. GPS tracking active.`);
  };

  const handleSimulateFieldUpdate = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setState("verified");
      updateWaterCase(caseId, {
        state: "verified",
      });
      toast.success("Simulated field inspection report received! Feeder pressure verified at 0.8 bar.");
    }, 1000);
  };

  const handleForwardToGov = () => {
    setState("forwarded");
    updateWaterCase(caseId, {
      state: "forwarded",
    });
    toast.success("Case forwarded to Raichur Water Supply Board for supply re-balancing!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Water Case Workspace (${caseId})`}
        subtitle="Review community pressure drop, dispatch on-ground verification, and forward validated cases to the department."
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: caseId },
        ]}
        actions={
          <Link href="/supervisor/water">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Desk</span>
            </Button>
          </Link>
        }
      />

      {/* Case Header Details */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">XYZ Colony Water Supply Pressure Drop</h2>
              <StatusBadge
                status={state === "forwarded" ? "complete" : state === "verified" ? "normal" : "warning"}
                label={state.toUpperCase().replace("_", " ")}
              />
            </div>
            <p className="text-xs text-white/60">
              78 Household Reports · Planned 7:00–8:00 AM · Feeder Valve 4B
            </p>
          </div>

          {/* Demo Action: Simulate Field Update */}
          {state === "verification_in_progress" && (
            <Button
              onClick={handleSimulateFieldUpdate}
              disabled={simulating}
              className="bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold h-9 gap-2 shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${simulating ? "animate-spin" : ""}`} />
              <span>{simulating ? "Receiving Telemetry..." : "Simulate Field Update"}</span>
            </Button>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
          <span className="font-bold block mb-0.5">AI Diagnostic Assessment</span>
          <p className="text-white/70">
            Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area&apos;s planned supply and historical pattern.
          </p>
        </div>
      </div>

      {/* Step 1: Assign Assistant */}
      {state === "under_review" && (
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Assign Field Assistant for Verification</h3>
          <p className="text-xs text-white/60">
            Dispatch an authorized municipal field assistant to measure junction pressure and verify physical conditions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Suresh M (Team 04)", "Arif Khan (Team 02)", "Ravi Kumar (Team 01)"].map((ass) => (
              <button
                key={ass}
                type="button"
                onClick={() => setSelectedAssistant(ass)}
                className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${
                  selectedAssistant === ass
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                <div className="font-semibold">{ass}</div>
                <div className="text-[10px] text-white/40 mt-0.5">GPS Active · Available</div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleAssign}
            className="bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>Confirm Assignment & Track Live</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Step 2: Verification In Progress */}
      {state === "verification_in_progress" && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
            <h3 className="text-sm font-bold text-amber-300">Live Field Verification In Progress</h3>
          </div>
          <p className="text-xs text-white/70">
            {selectedAssistant} has arrived at Sector 2 feeder junction. Testing manifold pressure gauge at Feeder Line 4B.
          </p>
          <div className="text-[11px] text-white/50">
            Tip for demo: Click the <span className="font-bold text-amber-400">&quot;Simulate Field Update&quot;</span> button above to simulate field inspection receipt.
          </div>
        </div>
      )}

      {/* Step 3: Verified Report Ready */}
      {state === "verified" && (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4" />
            <span>Field Verification Report Verified</span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Inspector:</span>
              <span className="text-white font-medium">{selectedAssistant}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Observed Supply Window:</span>
              <span className="text-white font-mono">07:12 AM – 07:42 AM (30 min actual)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Observed Feeder Pressure:</span>
              <span className="text-amber-400 font-mono font-bold">0.8 Bar (Expected: 1.4 Bar)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/60">Affected Area:</span>
              <span className="text-white">Streets A, B, and C in XYZ Colony</span>
            </div>
          </div>

          <Button
            onClick={handleForwardToGov}
            className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Validate & Forward to Raichur Water Board</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Step 4: Forwarded to Gov */}
      {state === "forwarded" && (
        <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/[0.04] backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
            <ShieldCheck className="h-5 w-5" />
            <span>Forwarded to Government Water Supply Board</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Case has been escalated to municipal engineers. A supply re-balancing adjustment has been scheduled for tomorrow morning (7:00 AM – 8:15 AM). Affected citizens have been notified.
          </p>
        </div>
      )}
    </div>
  );
}
