"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Droplet, FileText, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusTimeline } from "@/components/savera/StatusTimeline";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function WaterReportTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const timelineSteps = [
    {
      title: "Report Submitted",
      description: "Feedback captured for Household H-1024 (Low pressure, 30 min duration).",
      timestamp: "Today, 07:45 AM",
      status: "completed" as const,
    },
    {
      title: "AI Area Pattern Analysis",
      description: "Aggregated with 77 other household reports in XYZ Colony into Case XYZ-001.",
      timestamp: "Today, 08:00 AM",
      status: "completed" as const,
    },
    {
      title: "Supervisor Review",
      description: "Ward 24 Supervisor reviewed severity and dispatched field verification.",
      timestamp: "Today, 08:30 AM",
      status: "completed" as const,
    },
    {
      title: "Field Verification",
      description: "Field Assistant Suresh M (Team 04) conducted pressure test at Feeder Valve 4B.",
      timestamp: "Today, 09:15 AM",
      status: "current" as const,
    },
    {
      title: "Department Action Scheduled",
      description: "Raichur Water Supply Board scheduled feeder re-balancing for tomorrow morning.",
      timestamp: "Pending",
      status: "upcoming" as const,
    },
  ];

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
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Portal</span>
            </Button>
          </Link>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-xs text-white/50 font-mono">Case Reference</span>
            <div className="text-sm font-bold text-teal-400 font-mono">CASE-XYZ-001 (High Concern)</div>
          </div>
          <StatusBadge status="in_progress" label="Field Verification in Progress" />
        </div>

        <StatusTimeline steps={timelineSteps} />

        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
          <span className="font-bold block mb-1">Human-In-The-Loop Municipal Verification</span>
          <p className="text-white/70">
            SAVERA coordinates citizen reporting with physical on-ground inspections before department adjustments are scheduled. You will receive an SMS and in-app notification when resolved.
          </p>
        </div>
      </div>
    </div>
  );
}
