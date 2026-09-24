"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function SupervisorWaterDashboard() {
  const areas = [
    { id: "area-xyz", name: "XYZ Colony", reports: 78, status: "Pending Verification", tone: "danger" as const, caseId: "case-xyz-001" },
    { id: "area-abc", name: "ABC Colony", reports: 34, status: "In Progress", tone: "warning" as const, caseId: "case-abc-002" },
    { id: "area-def", name: "DEF Colony", reports: 12, status: "Verified & Resolved", tone: "normal" as const, caseId: "case-def-003" },
    { id: "area-ghi", name: "GHI Colony", reports: 56, status: "Pending Verification", tone: "danger" as const, caseId: "case-ghi-004" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Water Supply Operations"
        subtitle="Monitor area supply schedules, triage AI-grouped citizen pressure reports, and coordinate field verification teams."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="warning" label="3 Cases Require Action" />
            <span className="text-xs font-mono text-white/50">Ward 24 Desk</span>
          </div>
        }
        actions={
          <Link href="/supervisor/water/verified">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              <span>Verified Reports Archive</span>
            </Button>
          </Link>
        }
      />

      {/* Exact KPIs from Section 6.13 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Assigned Areas"
          value="12"
          subtitle="Ward 24 localities"
          badge={<StatusBadge status="normal" label="Covered" />}
        />
        <KpiCard
          title="Active Concerns"
          value="5"
          subtitle="Grouped supply issues"
          badge={<StatusBadge status="warning" label="Active" />}
        />
        <KpiCard
          title="Pending Verification"
          value="3"
          subtitle="Awaiting field assignment"
          badge={<StatusBadge status="warning" label="Pending" />}
        />
        <KpiCard
          title="Field Teams Ready"
          value="6"
          subtitle="GPS enabled inspectors"
          badge={<StatusBadge status="normal" label="Available" />}
        />
        <KpiCard
          title="Reports Verified Today"
          value="8"
          subtitle="Forwarded to Board"
          badge={<StatusBadge status="complete" label="Resolved" />}
        />
      </div>

      {/* AI Water Supply Alerts (Grouped Case Highlight) */}
      <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/[0.03] backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            <span>AI Supply Alert · High Severity Concern</span>
          </div>
          <span className="text-xs font-mono text-white/50">Generated 08:00 AM Today</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              XYZ Colony — 78 Citizen Reports (Low Water Pressure)
            </h3>
            <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
              Planned schedule: 7:00 AM – 8:00 AM. 61 households report low pressure, 11 short duration, 6 zero flow. AI pattern assessment: Possible supply-demand gap at Feeder Valve 4B. Field verification required before department escalation.
            </p>
          </div>

          <Link href="/supervisor/water/cases/case-xyz-001" className="shrink-0">
            <Button className="bg-rose-500 text-white hover:bg-rose-400 font-semibold text-xs h-9 px-5 gap-2 shadow-lg shadow-rose-500/20">
              <span>Open Case Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Ward Areas Triage Table */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4">Ward 24 Localities & Case Status</h3>

        <div className="divide-y divide-white/5">
          {areas.map((a) => (
            <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  a.tone === "danger" ? "bg-rose-500/15 text-rose-400" : a.tone === "warning" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                }`}>
                  <Droplet className="h-4 w-4" />
                </div>
                <div>
                  <Link href={`/supervisor/water/areas/${a.id}`} className="font-bold text-white hover:text-teal-300 text-sm">
                    {a.name}
                  </Link>
                  <p className="text-white/50 text-[11px] mt-0.5">{a.reports} citizen reports logged today</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={a.tone} label={a.status} />
                <Link href={`/supervisor/water/cases/${a.caseId}`}>
                  <Button variant="outline" size="sm" className="h-8 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10">
                    <span>Manage Case</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
