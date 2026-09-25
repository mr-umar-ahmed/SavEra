"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  FileCheck,
  Filter,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";

export default function VerifiedReportsPage() {
  const waterCases = useDataStore((s) => s.waterCases);
  const areas = useDataStore((s) => s.areas);
  const [filter, setFilter] = useState<"all" | "action_scheduled" | "resolved">("all");

  // Get all verified/forwarded/action_scheduled/resolved cases
  const relevantCases = waterCases.filter((c) =>
    ["verified", "forwarded", "action_scheduled", "resolved"].includes(c.state),
  );

  // If case-xyz-001 isn't in those states yet, include a calibrated row for auditing
  const displayList = relevantCases.length > 0 ? relevantCases : [
    {
      id: "case-xyz-001",
      areaId: "area-xyz",
      wardId: "ward-24",
      reportCount: 78,
      state: "action_scheduled" as const,
      updatedAt: "2026-09-25T08:15:00.000Z",
      detectedAt: "2026-09-25T07:15:00.000Z",
      departmentAction: {
        description: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
        status: "scheduled" as const,
      },
    },
    {
      id: "case-def-001",
      areaId: "area-def",
      wardId: "ward-24",
      reportCount: 12,
      state: "resolved" as const,
      updatedAt: "2026-09-24T14:30:00.000Z",
      detectedAt: "2026-09-24T08:00:00.000Z",
      departmentAction: {
        description: "Manifold pressure calibrated. Optimal delivery restored.",
        status: "completed" as const,
      },
    },
    {
      id: "case-w18-h1",
      areaId: "area-w18-01",
      wardId: "ward-18",
      reportCount: 28,
      state: "action_scheduled" as const,
      updatedAt: "2026-09-24T11:00:00.000Z",
      detectedAt: "2026-09-24T07:30:00.000Z",
      departmentAction: {
        description: "Secondary booster pump activated. Pressure normalized across Sector 4.",
        status: "scheduled" as const,
      },
    },
    {
      id: "case-w11-h1",
      areaId: "area-w11-01",
      wardId: "ward-11",
      reportCount: 19,
      state: "resolved" as const,
      updatedAt: "2026-09-23T16:45:00.000Z",
      detectedAt: "2026-09-23T08:15:00.000Z",
      departmentAction: {
        description: "Sluice valve valve obstruction cleared. Flow restored.",
        status: "completed" as const,
      },
    },
  ];

  const filtered = displayList.filter((c) => {
    if (filter === "all") return true;
    return c.state === filter;
  });

  const getAreaName = (areaId: string) => {
    return areas.find((a) => a.id === areaId)?.name ?? (
      areaId === "area-xyz" ? "XYZ Colony" :
      areaId === "area-def" ? "DEF Colony" :
      areaId === "area-w18-01" ? "North Sector 4" :
      areaId === "area-w11-01" ? "Industrial Enclave" : areaId
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Verified Reports & Department Updates"
        subtitle="Audited on-ground verification logs and municipal water board interventions across Ward 24."
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: "Verified Reports" },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-ink">
              <MapPin className="h-3 w-3" />
              Ward 24 Supervisor Desk
            </span>
            <StatusBadge status="normal" label="Audit Trail Active" />
          </div>
        }
        actions={
          <Link href="/supervisor/water">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground hover:bg-secondary">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Desk</span>
            </Button>
          </Link>
        }
      />

      {/* Verbatim Department Response Card */}
      <div className="p-6 rounded-2xl border border-positive/40 bg-positive/[0.04] backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider font-mono">
            <ShieldCheck className="h-4 w-4" />
            <span>Latest Municipal Department Response</span>
          </div>
          <StatusBadge status="complete" label="Action Scheduled" />
        </div>

        <p className="text-sm font-semibold text-positive leading-relaxed font-sans">
          &quot;Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM. 🟢 Action Scheduled&quot;
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 font-mono">
          <span>Target: Feeder Line 4B (XYZ Colony)</span>
          <span>·</span>
          <span>Window Extension: +15 minutes</span>
          <span>·</span>
          <span>Status: Verified & Broadcasted</span>
        </div>
      </div>

      {/* Filter Tabs & Table Container */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-teal-ink" />
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
              Verified Case Registry
            </h3>
            <span className="text-xs font-mono text-faint">({filtered.length} records)</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === "all" ? "bg-positive text-positive-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("action_scheduled")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === "action_scheduled" ? "bg-positive text-positive-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Action Scheduled
            </button>
            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === "resolved" ? "bg-positive text-positive-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {filtered.map((item) => {
            const isResolved = item.state === "resolved";
            const areaName = getAreaName(item.areaId);

            return (
              <div
                key={item.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs group hover:bg-muted/60 px-2 rounded-xl transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-foreground font-mono text-sm tracking-wide">
                      {item.id.toUpperCase()}
                    </span>
                    <span className="text-faint">·</span>
                    <span className="font-semibold text-foreground">{areaName}</span>
                    <span className="text-faint font-mono">({item.reportCount} reports)</span>
                    <StatusBadge
                      status={isResolved ? "complete" : "normal"}
                      label={isResolved ? "Resolved" : "Action Scheduled"}
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-muted/60 border border-border/60 text-xs space-y-1">
                    <div className="text-muted-foreground">
                      Municipal Intervention:
                    </div>
                    <div className="text-positive font-medium font-sans">
                      {item.departmentAction?.description ??
                        "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-xs font-mono text-faint hidden sm:block">
                    <div>Updated:</div>
                    <div className="text-soft">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "08:15 AM"}
                    </div>
                  </div>

                  <Link href={`/supervisor/water/cases/${item.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-muted text-xs text-teal-ink hover:bg-teal-500/10 hover:border-teal-500/30 gap-1.5 h-8"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
