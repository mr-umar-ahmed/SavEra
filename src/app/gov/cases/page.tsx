"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  FileCheck,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { DemoControl } from "@/components/savera/DemoControl";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function GovCasesPage() {
  const waterCases = useDataStore((s) => s.waterCases);
  const updateWaterCase = useDataStore((s) => s.updateWaterCase);
  const pushNotification = useDataStore((s) => s.pushNotification);

  // Active target case
  const targetCase = waterCases.find((c) => c.id === "case-xyz-001") ?? waterCases[0];

  // Action form fields with canonical spec defaults
  const [actionType, setActionType] = useState<
    "supply_adjustment" | "pressure_boost" | "tanker_dispatch" | "maintenance"
  >("supply_adjustment");
  const [scheduleDate, setScheduleDate] = useState("Tomorrow morning distribution");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:15");
  const [note, setNote] = useState(
    "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
  );
  const [isSimulating, setIsSimulating] = useState(false);

  // Case state
  const isActionScheduled = targetCase?.state === "action_scheduled";
  const isResolved = targetCase?.state === "resolved";

  // Simulate department action (DemoControl)
  const handleSimulateFill = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setActionType("supply_adjustment");
      setScheduleDate("Tomorrow morning distribution");
      setStartTime("07:00");
      setEndTime("08:15");
      setNote("Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.");
      toast.info("Prefilled department action with canonical specification parameters.");
    }, 300);
  };

  const handleRecordAction = () => {
    const now = new Date().toISOString();
    const description = note || "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.";

    updateWaterCase("case-xyz-001", {
      state: "action_scheduled",
      departmentAction: {
        caseId: "case-xyz-001",
        actionType,
        scheduledFor: now.slice(0, 10),
        newSchedule: {
          start: startTime,
          end: endTime,
        },
        description,
        status: "scheduled",
        updatedAt: now,
        by: "Water Supply Board",
      },
      history: [
        ...(targetCase?.history ?? []),
        { state: "action_scheduled", at: now, note: description },
      ],
    });

    // Notifications to supervisor and citizen (verbatim spec §9)
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
      body: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
      stream: "water",
      href: "/supervisor/water/verified",
    });

    toast.success("Department action recorded: Re-balancing schedule broadcast to Ward 24!");
  };

  const handleMarkResolved = () => {
    const now = new Date().toISOString();
    updateWaterCase("case-xyz-001", {
      state: "resolved",
      history: [
        ...(targetCase?.history ?? []),
        { state: "resolved", at: now, note: "Resolved — supply adjusted to 7:00–8:15 AM." },
      ],
    });

    // Closing citizen notification (verbatim spec §9)
    pushNotification({
      target: { role: "citizen", areaIds: ["area-xyz"] },
      type: "water_action",
      title: "Water Report Resolved",
      body: "Your water report WR-24-0913 is resolved — supply adjusted to 7:00–8:15 AM.",
      stream: "water",
      href: "/citizen/water",
    });

    toast.success("Case resolved. Closing citizen notifications broadcasted.");
  };

  const handleResetDemo = () => {
    updateWaterCase("case-xyz-001", {
      state: "forwarded",
      departmentAction: undefined,
    });
    toast.info("Demo reset to Forwarded state.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <PageHeader
        title="Forwarded Water Cases & Department Operations"
        subtitle="Review supervisor-verified field reports, record municipal operational actions, and broadcast adjusted supply schedules."
        breadcrumbs={[
          { label: "City Water Board", href: "/gov/water" },
          { label: "Forwarded Cases" },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-ink">
              <MapPin className="h-3 w-3" />
              Ward 24 Escalations
            </span>
            <StatusBadge
              status={isResolved ? "complete" : isActionScheduled ? "complete" : "warning"}
              label={
                isResolved
                  ? "Resolved"
                  : isActionScheduled
                    ? "Action Scheduled"
                    : "1 Action Required"
              }
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/gov/water">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground hover:bg-secondary">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Water Board Command</span>
              </Button>
            </Link>
            {(isActionScheduled || isResolved) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDemo}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                title="Reset to Forwarded state"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Main Forwarded Case Card */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-foreground font-mono text-base">CASE-XYZ-001</span>
              <StatusBadge
                status={isResolved ? "complete" : isActionScheduled ? "complete" : "warning"}
                label={
                  isResolved
                    ? "Resolved"
                    : isActionScheduled
                      ? "Action Scheduled"
                      : "Escalated by Ward 24 Supervisor"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Forwarded by Ward 24 Supervisor (Rajesh Gowda) · Feeder Line 4B (XYZ Colony)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-rose-ink font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
              78 Households Affected
            </span>
          </div>
        </div>

        {/* Field Inspection Summary (Spec 04 §9 verbatim) */}
        <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
              Supervisor Field Verification Summary
            </span>
            <span className="text-positive font-mono text-2xs flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verified On-Site
            </span>
          </div>
          <p className="text-soft leading-relaxed font-sans">
            Field Assistant Suresh M (Team 04) conducted physical pressure test at Feeder Line 4B. Observed supply: <strong>7:12–7:42 AM (30 min actual vs 60 min planned)</strong>. Manifold pressure observed at <strong>0.8 bar (Low · normal 1.4 bar)</strong>. Affected streets: <strong>Streets A, B, and C</strong>.
          </p>
        </div>

        {/* State 1: Record Action Form */}
        {!isActionScheduled && !isResolved && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  Record Department Operational Action
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Execute municipal valve adjustment or pump boosting schedule for Feeder Line 4B.
                </p>
              </div>

              {/* Demo prefill button */}
              <DemoControl
                label="Simulate Department Action"
                description="Prefill canonical adjustment parameters"
                icon={RefreshCw}
                onClick={handleSimulateFill}
                loading={isSimulating}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Action Type Dropdown */}
              <div className="space-y-1.5">
                <label className="font-bold text-soft block font-mono">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) =>
                    setActionType(
                      e.target.value as
                        | "supply_adjustment"
                        | "pressure_boost"
                        | "tanker_dispatch"
                        | "maintenance",
                    )
                  }
                  className="w-full p-2.5 rounded-xl bg-inset border border-border text-foreground font-mono text-xs focus:outline-none focus:border-teal-500/50"
                >
                  <option value="supply_adjustment">Supply adjustment (Window Extension)</option>
                  <option value="pressure_boost">Pressure boost (Auxiliary Pump)</option>
                  <option value="maintenance">Pipeline inspection & repair</option>
                  <option value="tanker_dispatch">Tanker dispatch (Emergency Buffer)</option>
                </select>
              </div>

              {/* Execution Schedule */}
              <div className="space-y-1.5">
                <label className="font-bold text-soft block font-mono">Execution Schedule</label>
                <input
                  type="text"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-inset border border-border text-foreground font-mono text-xs focus:outline-none focus:border-teal-500/50"
                />
              </div>

              {/* New Planned Supply Window Start */}
              <div className="space-y-1.5">
                <label className="font-bold text-soft block font-mono">New Supply Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-inset border border-border text-foreground font-mono text-xs focus:outline-none focus:border-teal-500/50"
                />
              </div>

              {/* New Planned Supply Window End */}
              <div className="space-y-1.5">
                <label className="font-bold text-soft block font-mono">
                  New Supply End Time (+15 min adjustment)
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-inset border border-border text-teal-ink font-mono text-xs font-bold focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>

            {/* Action Broadcast Message */}
            <div className="space-y-1.5">
              <label className="font-bold text-soft block font-mono text-xs">
                Community Broadcast Notice (Verbatim)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 rounded-xl bg-inset border border-border text-xs text-foreground focus:outline-none focus:border-teal-500/50"
              />
            </div>

            <Button
              onClick={handleRecordAction}
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-10 gap-2 shadow-lg shadow-primary/10"
            >
              <Send className="h-4 w-4" />
              <span>Record Action & Broadcast to Ward 24 Community</span>
            </Button>
          </div>
        )}

        {/* State 2: Action Scheduled View */}
        {isActionScheduled && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-positive/10 border border-positive/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-positive font-bold font-mono">
                <CheckCircle2 className="h-4 w-4" />
                <span>Department Operational Action Scheduled</span>
              </div>
              <p className="text-soft leading-relaxed font-sans">
                <strong>Verbatim Response:</strong> &quot;Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.&quot;
              </p>
              <div className="text-xs text-muted-foreground pt-1 font-mono">
                Affected citizens and Ward 24 supervisor have received official notification.
              </div>
            </div>

            <Button
              onClick={handleMarkResolved}
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-10 gap-2 shadow-lg shadow-primary/10"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Resolved & Send Closing Community Advisory</span>
            </Button>
          </div>
        )}

        {/* State 3: Resolved View */}
        {isResolved && (
          <div className="p-6 rounded-xl bg-positive/10 border border-positive/30 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-positive mx-auto" />
            <h4 className="text-sm font-bold text-foreground">Case Resolved Successfully</h4>
            <p className="text-xs text-soft max-w-md mx-auto">
              Closing notification dispatched to citizen reports: &quot;Your water report WR-24-0913 is resolved — supply adjusted to 7:00–8:15 AM.&quot;
            </p>
          </div>
        )}
      </div>

      {/* Historical Audit Trail of Other Ward Cases */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
          Other Ward Escalations & Operations
        </h3>

        <div className="divide-y divide-border text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground font-mono">CASE-DEF-001 (Ward 24)</span>
              <p className="text-faint text-xs">DEF Colony · 12 reports · Manifold calibrated</p>
            </div>
            <StatusBadge status="complete" label="Resolved" />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground font-mono">CASE-W18-H1 (Ward 18)</span>
              <p className="text-faint text-xs">North Sector 4 · 28 reports · Booster pump scheduled</p>
            </div>
            <StatusBadge status="complete" label="Action Scheduled" />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground font-mono">CASE-W11-H1 (Ward 11)</span>
              <p className="text-faint text-xs">Industrial Enclave · 19 reports · Sluice valve cleared</p>
            </div>
            <StatusBadge status="complete" label="Resolved" />
          </div>
        </div>
      </div>
    </div>
  );
}
