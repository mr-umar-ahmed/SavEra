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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-ink">
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
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground hover:bg-secondary">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Desk</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDemo}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Reset case to Under Review for evaluation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        }
      />

      {/* Case Summary Card */}
      <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground">XYZ Colony Water Supply Pressure Drop</h2>
              <span className="text-xs font-mono bg-rose-500/20 text-rose-ink px-2 py-0.5 rounded-full border border-rose-500/30">
                Severity: HIGH
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
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
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-ink">
          <span className="font-bold block mb-1">AI Diagnostic Telemetry</span>
          <p className="text-soft leading-relaxed font-sans">{AI_ASSESSMENT}</p>
        </div>
      </div>

      {/* STAGE 1: UNDER REVIEW */}
      {currentState === "under_review" && (
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground font-mono uppercase tracking-wider">
              Verification Decision & Dispatch
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Evaluate the 78 citizen reports and assign an authorized field assistant to perform pressure testing and manifold verification.
            </p>
          </div>

          {/* Assistant Picker */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block font-mono">
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
                        ? "bg-teal-500/15 border-teal-500/40 text-teal-ink shadow-md shadow-positive/10"
                        : "bg-muted border-border text-soft hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{ass.name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-teal-ink" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-2xs text-faint mt-1 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
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
              <label className="font-bold text-soft block font-mono">Priority Level</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={`flex-1 py-2 px-3 rounded-lg border font-mono font-medium ${
                    priority === "high"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-ink"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  High (Urgent Dispatch)
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("medium")}
                  className={`flex-1 py-2 px-3 rounded-lg border font-mono font-medium ${
                    priority === "medium"
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-ink"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  Medium (Standard Window)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-soft block font-mono">Verification Deadline</label>
              <div className="p-2.5 rounded-lg bg-muted border border-border font-mono text-soft flex items-center justify-between">
                <span>Today, 12:00 PM</span>
                <Clock className="h-3.5 w-3.5 text-teal-ink" />
              </div>
            </div>
          </div>

          {/* 8-Item Field Checklist Preview */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block font-mono">
              2. Standard Field Verification Checklist (8 Tasks)
            </label>
            <div className="p-4 rounded-xl bg-inset border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-soft">
              {DEFAULT_FIELD_CHECKLIST.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-teal-ink text-xs font-bold">{idx + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block font-mono">
              3. Supervisor Action Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspect main valve manifold at Sector 2 and verify junction pressure at Street B."
              className="w-full p-3 rounded-xl bg-inset border border-border text-xs text-foreground placeholder:text-faint focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleAssignAssistant}
              className="flex-1 bg-positive text-positive-foreground hover:bg-positive/90 font-semibold text-xs h-10 gap-2 shadow-lg shadow-positive/10"
            >
              <UserCheck className="h-4 w-4" />
              <span>Assign Field Verification ({selectedAssistant})</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkForMonitoring}
              className="border-border bg-muted text-xs text-foreground hover:bg-secondary h-10"
            >
              Mark for Monitoring
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestMoreInfo}
              className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-ink hover:bg-amber-500/20 h-10"
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
            <div className="flex items-center gap-2 text-teal-ink font-bold text-xs uppercase tracking-wider font-mono">
              <UserCheck className="h-4 w-4" />
              <span>Field Verification Assigned</span>
            </div>
            <StatusBadge status="warning" label="Pending Dispatch" />
          </div>

          <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Assigned Inspector:</span>
              <span className="text-foreground font-medium">{selectedAssistant}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Target Area:</span>
              <span className="text-foreground">XYZ Colony (Sector 2 Feeder)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Mandate:</span>
              <span className="text-foreground">8-point protocol checklist · Manifold pressure measurement</span>
            </div>
          </div>

          <Button
            onClick={handleStartFieldVerification}
            className="w-full bg-positive text-positive-foreground hover:bg-positive/90 font-semibold text-xs h-10 gap-2 shadow-lg shadow-positive/10"
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
              <div aria-hidden="true" className="h-3 w-3 rounded-full bg-tone-moderate animate-ping" />
              <h3 className="text-sm font-bold text-amber-ink font-mono uppercase tracking-wider">
                Live Field Verification In Progress
              </h3>
            </div>
            <span className="text-xs font-mono text-positive font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-positive" />
              GPS Active (7:05 AM)
            </span>
          </div>

          {/* Live Field Telemetry Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-inset border border-border/60">
              <span className="text-faint block text-2xs font-mono">SUPPLY START</span>
              <span className="font-mono text-foreground font-bold text-sm">
                {simStep >= 2 ? "07:12 AM" : "Checking..."}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-inset border border-border/60">
              <span className="text-faint block text-2xs font-mono">SUPPLY END</span>
              <span className="font-mono text-foreground font-bold text-sm">
                {simStep >= 4 ? "07:42 AM (30 min)" : "Active"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-inset border border-border/60">
              <span className="text-faint block text-2xs font-mono">PRESSURE GAUGE</span>
              <span className={`font-mono font-bold text-sm ${simStep >= 3 ? "text-amber-ink" : "text-muted-foreground"}`}>
                {simStep >= 3 ? "0.8 Bar (Low)" : "Pending"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-inset border border-border/60">
              <span className="text-faint block text-2xs font-mono">EVIDENCE UPLOADED</span>
              <span className="font-mono text-foreground font-bold text-sm">
                {simStep >= 5 ? "3 Photos + 1 Video" : `${Math.min(simStep, 2)} items`}
              </span>
            </div>
          </div>

          {/* Checklist progress */}
          <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-soft font-mono">Field Inspection Protocol</span>
              <span className="text-teal-ink font-mono font-bold">
                {simStep >= 5 ? "8 / 8 Complete" : `${Math.min(8, simStep * 2)} / 8 Items Done`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {DEFAULT_FIELD_CHECKLIST.map((item, idx) => {
                const isDone = isReportReady || (idx < simStep * 2);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-border-strong shrink-0" />
                    )}
                    <span className={isDone ? "text-foreground" : "text-faint"}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If 5 steps done or report ready, show validation prompt */}
          {isReportReady && (
            <div className="p-4 rounded-xl bg-positive/10 border border-positive/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-positive">
                  Field Report Submitted — Ready for Supervisor Validation
                </span>
                <StatusBadge status="normal" label="Telemetry Ready" />
              </div>
              <p className="text-xs text-soft">
                Assistant {selectedAssistant} has finalized measurements and submitted photo telemetry. Review and confirm below.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleConfirmValidation}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm (Verified)</span>
                </Button>
                <Button
                  onClick={handleRejectValidation}
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/10 text-xs text-rose-ink hover:bg-rose-500/20 h-9"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </Button>
                <Button
                  onClick={handleNeedsFurtherVerification}
                  variant="outline"
                  className="border-border bg-muted text-xs text-foreground hover:bg-secondary h-9"
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
        <div className="p-6 rounded-2xl border border-positive/30 bg-positive/[0.03] backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider font-mono">
              <CheckCircle2 className="h-4 w-4" />
              <span>Field Verification Confirmed by Supervisor</span>
            </div>
            <StatusBadge status="normal" label="Verified" />
          </div>

          <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Inspector:</span>
              <span className="text-foreground font-medium">{selectedAssistant}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Observed Supply Window:</span>
              <span className="text-foreground font-mono">07:12 AM – 07:42 AM · 30 min actual (planned 60 min)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Observed Pressure:</span>
              <span className="text-amber-ink font-mono font-bold">0.8 Bar (Low · Normal: 1.4 Bar)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Availability:</span>
              <span className="text-amber-ink font-medium">Partial</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Affected Streets:</span>
              <span className="text-foreground">Streets A, B, and C in XYZ Colony</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Simulated Evidence:</span>
              <span className="text-teal-ink font-mono">photo-01.jpg, photo-02.jpg, video-01.mp4 (3 items)</span>
            </div>
            <div className="py-1">
              <span className="text-muted-foreground block mb-0.5">Remarks:</span>
              <span className="text-foreground italic">
                &quot;Supply shorter than planned; pressure low across surveyed points.&quot;
              </span>
            </div>
          </div>

          {/* Action: Forward to Water Department */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              Forward to Municipal Water Supply Board
            </h4>
            <div className="p-3 rounded-xl bg-muted/60 border border-border/60 text-xs text-soft">
              Auto-filled forward summary:
              <span className="text-foreground font-medium block mt-1">
                Observed supply 7:12–7:42 AM (30 min actual vs 60 min planned). Low pressure (0.8 bar) across Streets A, B, C. 78 household reports confirmed.
              </span>
            </div>
            <Button
              onClick={handleForwardToGov}
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-10 gap-2 shadow-lg shadow-primary/10"
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
            <div className="flex items-center gap-2 text-teal-ink font-bold text-xs uppercase tracking-wider font-mono">
              <ShieldCheck className="h-5 w-5" />
              <span>Forwarded to Raichur Water Supply Board</span>
            </div>
            <StatusBadge status="normal" label="Awaiting Board Action" />
          </div>

          <p className="text-xs text-soft leading-relaxed font-sans">
            Case has been forwarded to municipal water engineers. Verification telemetry confirmed 0.8 bar low pressure and a 30-minute shortfall. The Board is reviewing feeder re-balancing for tomorrow&apos;s morning distribution.
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-ink font-mono">Demo Control Available</span>
              <span className="text-2xs font-mono bg-amber-500/20 text-amber-ink px-1.5 py-0.5 rounded">
                SIMULATE
              </span>
            </div>
            <p className="text-xs text-soft">
              Click the <strong className="text-amber-ink">&quot;Simulate Department Action&quot;</strong> button above to advance to <code className="text-teal-ink">action_scheduled</code>, or navigate to <Link href="/gov/cases" className="text-teal-ink underline font-semibold">Government Cases</Link> to execute it as the Water Board.
            </p>
          </div>
        </div>
      )}

      {/* STAGE 6: ACTION SCHEDULED */}
      {currentState === "action_scheduled" && (
        <div className="p-6 rounded-2xl border border-positive/40 bg-positive/[0.05] backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider font-mono">
              <CheckCircle2 className="h-5 w-5" />
              <span>Department Adjustment Scheduled</span>
            </div>
            <StatusBadge status="complete" label="Action Scheduled" />
          </div>

          <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-2 text-xs">
            <div className="text-muted-foreground">Verbatim Municipal Response:</div>
            <div className="text-sm font-semibold text-positive">
              &quot;Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.&quot;
            </div>
            <div className="text-xs text-faint pt-1 font-mono">
              Community notifications broadcast to Ward 24 · Feeder Line 4B booster pump scheduled
            </div>
          </div>

          <Button
            onClick={handleMarkResolved}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-10 gap-2 shadow-lg shadow-primary/10"
          >
            <span>Mark Case Resolved</span>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STAGE 7: RESOLVED */}
      {currentState === "resolved" && (
        <div className="p-6 rounded-2xl border border-positive/50 bg-positive/[0.08] backdrop-blur-xl space-y-4 text-center py-8">
          <CheckCircle2 className="h-10 w-10 text-positive mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Case Resolved & Community Notified</h3>
          <p className="text-xs text-soft max-w-md mx-auto leading-relaxed">
            The supply re-balancing adjustment has been recorded. Closing notifications were dispatched to all 78 reporting households in XYZ Colony.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleResetDemo}
              variant="outline"
              size="sm"
              className="border-border bg-muted text-xs text-foreground hover:bg-secondary gap-1.5"
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
          <div className="flex items-center gap-2 text-rose-ink font-bold text-xs uppercase tracking-wider font-mono">
            <XCircle className="h-5 w-5" />
            <span>Case Not Confirmed</span>
          </div>
          <p className="text-xs text-soft leading-relaxed font-sans">
            Field verification did not confirm a supply gap today in XYZ Colony. Closing advisory has been dispatched to reporting households.
          </p>
          <Button
            onClick={handleResetDemo}
            variant="outline"
            size="sm"
            className="border-border bg-muted text-xs text-foreground hover:bg-secondary gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restart Workflow</span>
          </Button>
        </div>
      )}

      {/* STAGE 9: NEEDS MORE */}
      {currentState === "needs_more" && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-ink font-bold text-xs uppercase tracking-wider font-mono">
            <AlertTriangle className="h-5 w-5" />
            <span>Further Verification / Information Requested</span>
          </div>
          <p className="text-xs text-soft leading-relaxed font-sans">
            Case requires supplementary data or re-inspection. You may re-assign a field team or review when citizen replies arrive.
          </p>
          <Button
            onClick={() => transitionTo("under_review", "Supervisor returning case to review")}
            className="bg-positive text-positive-foreground hover:bg-positive/90 font-semibold text-xs h-9 gap-1.5"
          >
            <span>Return to Review & Re-Assign</span>
          </Button>
        </div>
      )}
    </div>
  );
}
