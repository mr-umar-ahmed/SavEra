"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Droplet, FileText, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusTimeline } from "@/components/savera/StatusTimeline";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import type { CaseState } from "@/types";

export default function WaterReportTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const waterCases = useDataStore((s) => s.waterCases);
  const waterReports = useDataStore((s) => s.waterReports);

  // Find this report or fallback to seeded
  const report = waterReports.find((r) => r.id === id) ?? {
    id,
    date: "2026-09-25",
    experience: "less_than_usual",
    durationMin: 30,
    areaId: "area-xyz",
  };

  // Find linked case for XYZ Colony
  const currentCase =
    waterCases.find((c) => c.areaId === "area-xyz" && c.state !== "not_confirmed") ??
    waterCases[0];

  const caseState: CaseState = currentCase?.state ?? "under_review";

  // Map 5 citizen-facing steps from case state matching §4
  const getStepStatus = (stepNum: 1 | 2 | 3 | 4 | 5) => {
    switch (stepNum) {
      case 1:
        return "completed";
      case 2:
        if (caseState === "detected") return "current";
        return "completed";
      case 3:
        if (caseState === "under_review" || caseState === "verification_assigned") {
          return "current";
        }
        if (
          ["verification_in_progress", "verified", "forwarded", "action_scheduled", "resolved"].includes(
            caseState
          )
        ) {
          return "completed";
        }
        return "upcoming";
      case 4:
        if (
          caseState === "verification_in_progress" ||
          caseState === "needs_more"
        ) {
          return "current";
        }
        if (["verified", "forwarded", "action_scheduled", "resolved"].includes(caseState)) {
          return "completed";
        }
        return "upcoming";
      case 5:
        if (caseState === "forwarded" || caseState === "action_scheduled") {
          return "current";
        }
        if (caseState === "resolved") {
          return "completed";
        }
        return "upcoming";
    }
  };

  const timelineSteps = [
    {
      title: "1. Report Submitted",
      description: `Feedback captured for Household H-1024 (${report.experience.replace("_", " ")}, ${report.durationMin} min duration).`,
      timestamp: "Today, 07:45 AM",
      status: getStepStatus(1),
    },
    {
      title: "2. AI Area Pattern Analysis",
      description: "Grouped with 77 other reports from XYZ Colony into Case XYZ-001.",
      timestamp: "Today, 08:00 AM",
      status: getStepStatus(2),
    },
    {
      title: "3. Supervisor Review",
      description: "Ward 24 Supervisor reviewed severity and dispatched field verification.",
      timestamp: caseState === "detected" ? "Pending" : "Today, 08:30 AM",
      status: getStepStatus(3),
    },
    {
      title: "4. Field Verification",
      description:
        caseState === "verification_in_progress"
          ? "Field Assistant Ravi Kumar on site conducting pressure measurements."
          : ["verified", "forwarded", "action_scheduled", "resolved"].includes(caseState)
          ? "Observed supply 7:12–7:42 AM (30 min actual). Low pressure verified across streets A, B, C."
          : "Pending ground inspection assignment.",
      timestamp: ["verified", "forwarded", "action_scheduled", "resolved"].includes(caseState)
        ? "Today, 07:42 AM"
        : "Pending",
      status: getStepStatus(4),
    },
    {
      title: "5. Department Action",
      description:
        caseState === "action_scheduled" || caseState === "resolved"
          ? "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM."
          : caseState === "forwarded"
          ? "Validated report forwarded to Raichur Water Supply Board."
          : "Pending department scheduling.",
      timestamp:
        caseState === "resolved"
          ? "Resolved"
          : caseState === "action_scheduled"
          ? "Tomorrow, 7:00 AM"
          : "Pending",
      status: getStepStatus(5),
    },
  ];

  const getLatestUpdate = () => {
    if (caseState === "resolved") {
      return "Case resolved: Supply adjustment successfully applied (7:00–8:15 AM).";
    }
    if (caseState === "action_scheduled") {
      return "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.";
    }
    if (caseState === "forwarded") {
      return "Verified case forwarded to Raichur Water Supply Board for operational adjustment.";
    }
    if (caseState === "verified") {
      return "Field verification completed 7:42 AM — low pressure observed on streets A, B, C.";
    }
    if (caseState === "verification_in_progress") {
      return "Field Assistant Ravi Kumar on site conducting pressure measurements.";
    }
    if (caseState === "verification_assigned") {
      return "Field verification assigned for XYZ Colony.";
    }
    return "Under review by Ward 24 Area Supervisor.";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Water Report Timeline (${id})`}
        subtitle="End-to-end audit trail from citizen submission to municipal department resolution."
        breadcrumbs={[
          { label: "Water Portal", href: "/citizen/water" },
          { label: id },
        ]}
        actions={
          <Link href="/citizen/water">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Portal</span>
            </Button>
          </Link>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-[#070D0A]/95 p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
        {/* Header matching §4 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white font-mono text-base">{id}</span>
              <span className="text-xs text-white/50 font-mono">· {report.date}</span>
              <StatusBadge
                status={caseState === "resolved" ? "complete" : "warning"}
                label={caseState.toUpperCase().replace("_", " ")}
              />
            </div>
            <p className="text-xs text-teal-400 font-mono">
              Linked Case: Grouped with 77 other reports from XYZ Colony
            </p>
          </div>
          <span className="text-[11px] font-mono text-white/50 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            Issue: {report.experience.replace("_", " ")}
          </span>
        </div>

        {/* Latest Update Line */}
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-200 flex items-start gap-2.5">
          <Droplet className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-white">Latest Municipal Update:</span>
            <p className="mt-0.5">{getLatestUpdate()}</p>
          </div>
        </div>

        {/* 5-Step Timeline */}
        <div className="py-2">
          <StatusTimeline steps={timelineSteps} />
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 leading-relaxed font-mono">
          Human-in-the-loop guarantee: AI detects community report patterns; Area Supervisor assigns verification; Field Assistants physically verify; Municipal Engineers schedule operational supply adjustments.
        </div>
      </div>
    </div>
  );
}
