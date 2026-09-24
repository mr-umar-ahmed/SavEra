"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Droplet,
  FileCheck,
  History,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Waves,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { DemoControl } from "@/components/savera/DemoControl";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import {
  AI_ASSESSMENT,
  DEFAULT_FIELD_CHECKLIST,
  SIMULATED_FIELD_UPDATES,
} from "@/lib/engine/water";
import type { CaseState } from "@/types";
import { toast } from "sonner";

export default function SupervisorCaseWorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const waterCases = useDataStore((s) => s.waterCases);
  const updateWaterCase = useDataStore((s) => s.updateWaterCase);
  const pushNotification = useDataStore((s) => s.pushNotification);

  // Retrieve matching case or fall back to XYZ-001
  const existingCase = waterCases.find((c) => c.id === caseId) ?? waterCases[0];

  // Local interactive state tracking
  const [currentState, setCurrentState] = useState<CaseState>(
    existingCase?.state ?? "under_review",
  );
  const [selectedAssistant, setSelectedAssistant] = useState<string>("Ravi Kumar");
  const [priority, setPriority] = useState<"high" | "medium">("high");
  const [simStep, setSimStep] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [simulating, setSimulating] = useState<boolean>(false);

  // Keep local state in sync if store updates
  useEffect(() => {
    if (existingCase?.state && existingCase.state !== currentState) {
      setCurrentState(existingCase.state);
    }
  }, [existingCase?.state]);

  const assistants = [
    { name: "Ravi Kumar", status: "Available", gps: "Active", tone: "normal" as const },
    { name: "Team 04", status: "Available", gps: "Active", tone: "normal" as const },
    { name: "Arif Khan", status: "On GHI Case", gps: "Active", tone: "warning" as const },
    { name: "Suresh M", status: "On ABC Case", gps: "Active", tone: "warning" as const },
  ];

  // Helper to persist state transitions & add history
  const transitionTo = (newState: CaseState, note: string) => {
    const now = new Date().toISOString();
    setCurrentState(newState);
    if (existingCase) {
      updateWaterCase(existingCase.id, {
        state: newState,
        history: [
          ...(existingCase.history ?? []),
          { state: newState, at: now, note },
        ],
      });
    }
  };

  // Actions for 'under_review'
  const handleAssignAssistant = () => {
    transitionTo("verification_assigned", `Field verification assigned to ${selectedAssistant}`);
    pushNotification({
      target: { role: "citizen", areaIds: ["area-xyz"] },
      type: "water_case",
      title: "Field Verification Dispatched",
      body: "Field verification assigned for XYZ Colony. Municipal assistant en route.",
      stream: "water",
      href: "/citizen/water",
    });
    toast.success(`Assigned to ${selectedAssistant}. Priority: ${priority.toUpperCase()}.`);
  };

  const handleMarkForMonitoring = () => {
    transitionTo("under_review", `Marked for monitoring: ${notes || "Telemetry under watch"}`);
    toast.info("Case marked for ongoing telemetry monitoring.");
  };

  const handleRequestMoreInfo = () => {
    transitionTo("needs_more", `More info requested: ${notes || "Details on tap pressure"}`);
    pushNotification({
      target: { role: "citizen", areaIds: ["area-xyz"] },
      type: "water_case",
      title: "Additional Details Requested",
      body: "Supervisor requested more detail on today's supply in XYZ Colony.",
      stream: "water",
      href: "/citizen/water",
    });
    toast.warning("Requested additional information from reporting households.");
  };

  // Action for 'verification_assigned'
  const handleStartFieldVerification = () => {
    transitionTo("verification_in_progress", "Field assistant reached site; verification started.");
    toast.success("Field verification started. GPS telemetry streaming.");
  };

  // Action for 'verification_in_progress' - Demo step simulation
  const handleSimulateFieldStep = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      const nextStep = simStep + 1;
      setSimStep(nextStep);

      if (nextStep >= SIMULATED_FIELD_UPDATES.length) {
        // Complete report ready
        toast.success("Field inspection completed: 7:12–7:42 AM, 0.8 bar low pressure recorded.");
      } else {
        const update = SIMULATED_FIELD_UPDATES[nextStep - 1];
        toast.info(`Field update: ${update.text}`);
      }
    }, 400);
  };

  // Validation Actions: Confirm / Reject / Needs Further
  const handleConfirmValidation = () => {
    transitionTo("verified", "Field report confirmed by supervisor.");
    toast.success("Field report confirmed. Ready to forward to Water Supply Board.");
  };

  const handleRejectValidation = () => {
    transitionTo("not_confirmed", "Field verification did not confirm a supply gap today.");
    pushNotification({
      target: { role: "citizen", areaIds: ["area-xyz"] },
      type: "water_case",
      title: "Water Supply Verification Complete",
      body: "Field verification did not confirm a supply gap today in XYZ Colony.",
      stream: "water",
      href: "/citizen/water",
    });
    toast.error("Case marked as Not Confirmed.");
  };

  const handleNeedsFurtherVerification = () => {
    transitionTo("needs_more", "Further verification requested on secondary manifold.");
    toast.warning("Further verification requested.");
  };

  // Forward to Department
  const handleForwardToGov = () => {
    transitionTo("forwarded", "Forwarded to Raichur Water Supply Board.");
    pushNotification({
      target: { role: "gov", departments: ["water"] },
      type: "water_case",
      title: "Verified Case Forwarded",
      body: "Verified case forwarded from Ward 24 — XYZ Colony (78 reports, 0.8 bar low pressure).",
      stream: "water",
      href: "/gov/cases",
    });
    toast.success("Forwarded to Water Supply Board!");
  };

  // Simulate Department Action (Demo control when forwarded)
  const handleSimulateDepartmentAction = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      const now = new Date().toISOString();
      if (existingCase) {
        updateWaterCase(existingCase.id, {
          state: "action_scheduled",
          departmentAction: {
            caseId: existingCase.id,
            actionType: "supply_adjustment",
            scheduledFor: now.slice(0, 10),
            newSchedule: { start: "07:00", end: "08:15" },
            description: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
            status: "scheduled",
            updatedAt: now,
            by: "Water Supply Board",
          },
        });
      }
      setCurrentState("action_scheduled");
      pushNotification({
        target: { role: "citizen", areaIds: ["area-xyz"] },
        type: "water_action",
        title: "Water Supply Adjustment Scheduled",
        body: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
        stream: "water",
        href: "/citizen/water",
      });
      pushNotification({
        target: { role: "supervisor", wardIds: ["ward-24"] },
        type: "water_action",
        title: "Department Action Recorded",
        body: "Department action scheduled for Case XYZ-001: supply adjusted to 7:00–8:15 AM.",
        stream: "water",
        href: "/supervisor/water/verified",
      });
      toast.success("Department action recorded: New planned supply 7:00–8:15 AM.");
    }, 500);
  };

  // Mark Resolved
  const handleMarkResolved = () => {
    transitionTo("resolved", "Resolved — supply adjusted to 7:00–8:15 AM.");
    pushNotification({
      target: { role: "citizen", areaIds: ["area-xyz"] },
      type: "water_action",
      title: "Water Report Resolved",
      body: "Your water report WR-24-0913 is resolved — supply adjusted to 7:00–8:15 AM.",
      stream: "water",
      href: "/citizen/water",
    });
    toast.success("Case resolved. Closing notifications dispatched.");
  };

  // Reset demo
  const handleResetDemo = () => {
    transitionTo("under_review", "Demo reset to initial state");
    setSimStep(0);
    toast.info("Demo reset to Under Review.");
  };

  const isReportReady = simStep >= 5 || currentState === "verified" || currentState === "forwarded" || currentState === "action_scheduled" || currentState === "resolved";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <PageHeader
        title={`Water Case Workspace (${existingCase?.id.toUpperCase() ?? caseId.toUpperCase()})`}
        subtitle="Review community pressure drop, dispatch on-ground verification, and forward validated cases to the municipal water board."
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: existingCase?.id.toUpperCase() ?? caseId.toUpperCase() },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-400">
              <MapPin className="h-3 w-3" />
              XYZ Colony · Ward 24
            </span>
            <StatusBadge
              status={
                currentState === "resolved"
                  ? "complete"
                  : currentState === "forwarded" || currentState === "action_scheduled"
                    ? "normal"
                    : currentState === "verified"
                      ? "normal"
                      : "warning"
              }
              label={currentState.toUpperCase().replace("_", " ")}
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/supervisor/water">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Desk</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDemo}
              className="h-8 gap-1.5 text-xs text-white/50 hover:text-white"
              title="Reset case to Under Review for evaluation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        }
      />

      {/* Case Summary Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">XYZ Colony Water Supply Pressure Drop</h2>
              <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                Severity: HIGH
              </span>
            </div>
            <p className="text-xs text-white/60">
              78 Household Reports · Planned Supply: 7:00–8:00 AM (4,50,000 L) · Feeder Line 4B
            </p>
          </div>

          {/* Interactive Demo Controls in Header */}
          <div className="flex items-center gap-2">
            {currentState === "verification_in_progress" && (
              <DemoControl
                label={simStep < 5 ? `Simulate Field Update (${simStep}/5)` : "Field Telemetry Complete"}
                description={simStep < 5 ? "Simulate on-site telemetry receipt" : "Report ready for validation"}
                icon={RefreshCw}
                onClick={handleSimulateFieldStep}
                loading={simulating}
                disabled={simStep >= 5}
                size="sm"
              />
            )}

            {currentState === "forwarded" && (
              <DemoControl
                label="Simulate Department Action"
                description="Simulate Water Board schedule response"
                icon={Send}
                onClick={handleSimulateDepartmentAction}
                loading={simulating}
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Verbatim AI Assessment */}
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
          <span className="font-bold block mb-1">AI Diagnostic Telemetry</span>
          <p className="text-white/70 leading-relaxed font-sans">{AI_ASSESSMENT}</p>
        </div>
      </div>

      {/* STAGE 1: UNDER REVIEW */}
      {currentState === "under_review" && (
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
              Verification Decision & Dispatch
            </h3>
            <p className="text-xs text-white/60 mt-1">
              Evaluate the 78 citizen reports and assign an authorized field assistant to perform pressure testing and manifold verification.
            </p>
          </div>

          {/* Assistant Picker */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block font-mono">
              1. Select Field Assistant
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {assistants.map((ass) => {
                const isSelected = selectedAssistant === ass.name;
                return (
                  <button
                    key={ass.name}
                    type="button"
                    onClick={() => setSelectedAssistant(ass.name)}
                    className={`p-3.5 rounded-xl text-left border text-xs transition-all ${
                      isSelected
                        ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-md shadow-teal-500/10"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{ass.name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-1 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {ass.status} · GPS {ass.gps}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-white/80 block font-mono">Priority Level</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={`flex-1 py-2 px-3 rounded-lg border font-mono font-medium ${
                    priority === "high"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}
                >
                  High (Urgent Dispatch)
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("medium")}
                  className={`flex-1 py-2 px-3 rounded-lg border font-mono font-medium ${
                    priority === "medium"
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}
                >
                  Medium (Standard Window)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-white/80 block font-mono">Verification Deadline</label>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 font-mono text-white/80 flex items-center justify-between">
                <span>Today, 12:00 PM</span>
                <Clock className="h-3.5 w-3.5 text-teal-400" />
              </div>
            </div>
          </div>

          {/* 8-Item Field Checklist Preview */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider block font-mono">
              2. Standard Field Verification Checklist (8 Tasks)
            </label>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/70">
              {DEFAULT_FIELD_CHECKLIST.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 text-[11px] font-bold">{idx + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider block font-mono">
              3. Supervisor Action Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspect main valve manifold at Sector 2 and verify junction pressure at Street B."
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleAssignAssistant}
              className="flex-1 bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-10 gap-2 shadow-lg shadow-teal-500/20"
            >
              <UserCheck className="h-4 w-4" />
              <span>Assign Field Verification ({selectedAssistant})</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkForMonitoring}
              className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 h-10"
            >
              Mark for Monitoring
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestMoreInfo}
              className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 hover:bg-amber-500/20 h-10"
            >
              Request More Information
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 2: VERIFICATION ASSIGNED */}
      {currentState === "verification_assigned" && (
        <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/[0.03] backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider font-mono">
              <UserCheck className="h-4 w-4" />
              <span>Field Verification Assigned</span>
            </div>
            <StatusBadge status="warning" label="Pending Dispatch" />
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Assigned Inspector:</span>
              <span className="text-white font-medium">{selectedAssistant}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Target Area:</span>
              <span className="text-white">XYZ Colony (Sector 2 Feeder)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/60">Mandate:</span>
              <span className="text-white">8-point protocol checklist · Manifold pressure measurement</span>
            </div>
          </div>

          <Button
            onClick={handleStartFieldVerification}
            className="w-full bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-10 gap-2 shadow-lg shadow-teal-500/20"
          >
            <span>Start Live Verification & Activate GPS Telemetry</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STAGE 3: VERIFICATION IN PROGRESS */}
      {currentState === "verification_in_progress" && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-sm font-bold text-amber-300 font-mono uppercase tracking-wider">
                Live Field Verification In Progress
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              GPS Active (7:05 AM)
            </span>
          </div>

          {/* Live Field Telemetry Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px] font-mono">SUPPLY START</span>
              <span className="font-mono text-white font-bold text-sm">
                {simStep >= 2 ? "07:12 AM" : "Checking..."}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px] font-mono">SUPPLY END</span>
              <span className="font-mono text-white font-bold text-sm">
                {simStep >= 4 ? "07:42 AM (30 min)" : "Active"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px] font-mono">PRESSURE GAUGE</span>
              <span className={`font-mono font-bold text-sm ${simStep >= 3 ? "text-amber-400" : "text-white/60"}`}>
                {simStep >= 3 ? "0.8 Bar (Low)" : "Pending"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px] font-mono">EVIDENCE UPLOADED</span>
              <span className="font-mono text-white font-bold text-sm">
                {simStep >= 5 ? "3 Photos + 1 Video" : `${Math.min(simStep, 2)} items`}
              </span>
            </div>
          </div>

          {/* Checklist progress */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80 font-mono">Field Inspection Protocol</span>
              <span className="text-teal-400 font-mono font-bold">
                {simStep >= 5 ? "8 / 8 Complete" : `${Math.min(8, simStep * 2)} / 8 Items Done`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {DEFAULT_FIELD_CHECKLIST.map((item, idx) => {
                const isDone = isReportReady || (idx < simStep * 2);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0" />
                    )}
                    <span className={isDone ? "text-white/90" : "text-white/40"}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If 5 steps done or report ready, show validation prompt */}
          {isReportReady && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
                  Field Report Submitted — Ready for Supervisor Validation
                </span>
                <StatusBadge status="normal" label="Telemetry Ready" />
              </div>
              <p className="text-xs text-white/70">
                Assistant {selectedAssistant} has finalized measurements and submitted photo telemetry. Review and confirm below.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleConfirmValidation}
                  className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm (Verified)</span>
                </Button>
                <Button
                  onClick={handleRejectValidation}
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 hover:bg-rose-500/20 h-9"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </Button>
                <Button
                  onClick={handleNeedsFurtherVerification}
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 h-9"
                >
                  Needs Further Verification
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: VERIFIED REPORT READY & VALIDATED */}
      {currentState === "verified" && (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
              <CheckCircle2 className="h-4 w-4" />
              <span>Field Verification Confirmed by Supervisor</span>
            </div>
            <StatusBadge status="normal" label="Verified" />
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Inspector:</span>
              <span className="text-white font-medium">{selectedAssistant}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Observed Supply Window:</span>
              <span className="text-white font-mono">07:12 AM – 07:42 AM · 30 min actual (planned 60 min)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Observed Pressure:</span>
              <span className="text-amber-400 font-mono font-bold">0.8 Bar (Low · Normal: 1.4 Bar)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Availability:</span>
              <span className="text-amber-300 font-medium">Partial</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Affected Streets:</span>
              <span className="text-white">Streets A, B, and C in XYZ Colony</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/60">Simulated Evidence:</span>
              <span className="text-teal-400 font-mono">photo-01.jpg, photo-02.jpg, video-01.mp4 (3 items)</span>
            </div>
            <div className="py-1">
              <span className="text-white/60 block mb-0.5">Remarks:</span>
              <span className="text-white/90 italic">
                &quot;Supply shorter than planned; pressure low across surveyed points.&quot;
              </span>
            </div>
          </div>

          {/* Action: Forward to Water Department */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Forward to Municipal Water Supply Board
            </h4>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
              Auto-filled forward summary:
              <span className="text-white font-medium block mt-1">
                Observed supply 7:12–7:42 AM (30 min actual vs 60 min planned). Low pressure (0.8 bar) across Streets A, B, C. 78 household reports confirmed.
              </span>
            </div>
            <Button
              onClick={handleForwardToGov}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-10 gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Forward to Water Supply Board</span>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 5: FORWARDED TO GOV */}
      {currentState === "forwarded" && (
        <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/[0.04] backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider font-mono">
              <ShieldCheck className="h-5 w-5" />
              <span>Forwarded to Raichur Water Supply Board</span>
            </div>
            <StatusBadge status="normal" label="Awaiting Board Action" />
          </div>

          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Case has been forwarded to municipal water engineers. Verification telemetry confirmed 0.8 bar low pressure and a 30-minute shortfall. The Board is reviewing feeder re-balancing for tomorrow&apos;s morning distribution.
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-mono">Demo Control Available</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                SIMULATE
              </span>
            </div>
            <p className="text-xs text-white/70">
              Click the <strong className="text-amber-300">&quot;Simulate Department Action&quot;</strong> button above to advance to <code className="text-teal-300">action_scheduled</code>, or navigate to <Link href="/gov/cases" className="text-teal-400 underline font-semibold">Government Cases</Link> to execute it as the Water Board.
            </p>
          </div>
        </div>
      )}

      {/* STAGE 6: ACTION SCHEDULED */}
      {currentState === "action_scheduled" && (
        <div className="p-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.05] backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
              <CheckCircle2 className="h-5 w-5" />
              <span>Department Adjustment Scheduled</span>
            </div>
            <StatusBadge status="complete" label="Action Scheduled" />
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
            <div className="text-white/60">Verbatim Municipal Response:</div>
            <div className="text-sm font-semibold text-emerald-300">
              &quot;Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.&quot;
            </div>
            <div className="text-[11px] text-white/40 pt-1 font-mono">
              Community notifications broadcast to Ward 24 · Feeder Line 4B booster pump scheduled
            </div>
          </div>

          <Button
            onClick={handleMarkResolved}
            className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-10 gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Mark Case Resolved</span>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STAGE 7: RESOLVED */}
      {currentState === "resolved" && (
        <div className="p-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/[0.08] backdrop-blur-xl space-y-4 text-center py-8">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Case Resolved & Community Notified</h3>
          <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
            The supply re-balancing adjustment has been recorded. Closing notifications were dispatched to all 78 reporting households in XYZ Colony.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleResetDemo}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Demo Workflow</span>
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 8: NOT CONFIRMED */}
      {currentState === "not_confirmed" && (
        <div className="p-6 rounded-2xl border border-rose-500/40 bg-rose-500/[0.05] backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
            <XCircle className="h-5 w-5" />
            <span>Case Not Confirmed</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Field verification did not confirm a supply gap today in XYZ Colony. Closing advisory has been dispatched to reporting households.
          </p>
          <Button
            onClick={handleResetDemo}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restart Workflow</span>
          </Button>
        </div>
      )}

      {/* STAGE 9: NEEDS MORE */}
      {currentState === "needs_more" && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
            <AlertTriangle className="h-5 w-5" />
            <span>Further Verification / Information Requested</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Case requires supplementary data or re-inspection. You may re-assign a field team or review when citizen replies arrive.
          </p>
          <Button
            onClick={() => transitionTo("under_review", "Supervisor returning case to review")}
            className="bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 gap-1.5"
          >
            <span>Return to Review & Re-Assign</span>
          </Button>
        </div>
      )}
    </div>
  );
}
