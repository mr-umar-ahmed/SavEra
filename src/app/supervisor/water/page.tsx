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
  ShieldAlert,
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
    {
      id: "area-xyz",
      name: "XYZ Colony",
      status: "High",
      tone: "danger" as const,
      reports: 78,
      stage: "Pending",
      caseId: "case-xyz-001",
    },
    {
      id: "area-abc",
      name: "ABC Colony",
      status: "Moderate",
      tone: "warning" as const,
      reports: 34,
      stage: "In Progress",
      caseId: "case-abc-001",
    },
    {
      id: "area-def",
      name: "DEF Colony",
      status: "Normal",
      tone: "normal" as const,
      reports: 12,
      stage: "Verified",
      caseId: "case-def-001",
    },
    {
      id: "area-ghi",
      name: "GHI Colony",
      status: "High",
      tone: "danger" as const,
      reports: 56,
      stage: "Pending",
      caseId: "case-ghi-001",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Water Operations"
        subtitle="Monitor area supply schedules, triage AI-grouped citizen pressure reports, and coordinate field verification teams."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
              Ward 24
            </span>
            <span className="text-xs font-mono text-white/50">4 Localities Under Watch</span>
          </div>
        }
        actions={
          <Link href="/supervisor/water/verified">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-teal-300 rounded-xl"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              <span>Verified Reports &amp; Dept Updates</span>
            </Button>
          </Link>
        }
      />

      {/* 6.1 Exact KPIs matching §6.1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Assigned Areas"
          value="12"
          subtitle="Ward 24 coverage"
          badge={<StatusBadge status="normal" label="Covered" />}
        />
        <KpiCard
          title="Active Water Concerns"
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
          title="Field Teams Available"
          value="6"
          subtitle="GPS-enabled assistants"
          badge={<StatusBadge status="normal" label="Available" />}
        />
        <KpiCard
          title="Reports Verified Today"
          value="8"
          subtitle="Validated on ground"
          badge={<StatusBadge status="complete" label="Verified" />}
        />
      </div>

      {/* Area Table matching §6.1 */}
      <div className="rounded-3xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Ward Localities &amp; Report Triage</h3>
            <p className="text-xs text-white/50">Aggregates and counts only — no household data.</p>
          </div>
          <span className="text-xs font-mono text-white/40">4 Key Sectors</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-white/40 font-mono text-[11px]">
                <th className="pb-3 font-semibold">Area</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Citizen Reports</th>
                <th className="pb-3 text-right font-semibold">Stage</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {areas.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 font-sans font-bold text-white">
                    <Link
                      href={`/supervisor/water/areas/${a.id}`}
                      className="hover:text-teal-300 transition-colors"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={a.tone} label={a.status} />
                  </td>
                  <td className="py-3.5 text-right font-bold text-white">{a.reports}</td>
                  <td className="py-3.5 text-right text-white/70">{a.stage}</td>
                  <td className="py-3.5 text-right">
                    <Link href={`/supervisor/water/areas/${a.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        Area Report &rarr;
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6.2 AI Water Supply Alerts matching §6.2 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>AI Water Supply Alerts</span>
          </h3>
          <span className="text-xs font-mono text-white/50">Human in the Loop</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 🔴 HIGH · XYZ Colony */}
          <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/[0.03] backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>🔴 HIGH · XYZ Colony</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  78 households
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="text-white/80">
                  Planned supply: <strong className="font-mono text-white">7:00–8:00 AM</strong> · Availability significantly below expected · Frequency: High · Historical: Below normal.
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-rose-200/90 leading-relaxed font-mono">
                  AI assessment: Possible supply-demand gap. Field verification required.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center gap-3">
              <Link href="/supervisor/water/cases/case-xyz-001" className="flex-1">
                <Button className="w-full bg-rose-500 text-white hover:bg-rose-400 font-bold text-xs h-9 rounded-xl shadow-lg shadow-rose-500/20">
                  Open Case
                </Button>
              </Link>
              <Link href="/supervisor/water/areas/area-xyz">
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white h-9 rounded-xl px-4"
                >
                  View Area Report
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: 🔴 HIGH · GHI Colony */}
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-white/[0.02] backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  🔴 HIGH · GHI Colony
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  56 households
                </span>
              </div>
              <p className="text-xs text-white/70">
                Planned supply: 6:30–7:30 AM · Field verification assigned to <strong className="text-white">Arif Khan</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40 font-mono">Status: Verification Assigned</span>
              <Link href="/supervisor/water/cases/case-ghi-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-teal-400">
                  Open Case &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 3: 🟡 MODERATE · ABC Colony */}
          <div className="p-6 rounded-3xl border border-amber-500/20 bg-white/[0.02] backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  🟡 MODERATE · ABC Colony
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  34 households
                </span>
              </div>
              <p className="text-xs text-white/70">
                Planned supply: 7:30–8:30 AM · Field verification in progress with <strong className="text-white">Suresh M</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40 font-mono">Status: In Progress</span>
              <Link href="/supervisor/water/cases/case-abc-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-teal-400">
                  Open Case &rarr;
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 4: 🟢 NORMAL · DEF Colony */}
          <div className="p-6 rounded-3xl border border-emerald-500/20 bg-white/[0.02] backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  🟢 NORMAL · DEF Colony
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  12 households
                </span>
              </div>
              <p className="text-xs text-white/70">
                Planned supply: 8:00–9:00 AM · Full pressure confirmed on ground.
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-mono">Status: Verified</span>
              <Link href="/supervisor/water/cases/case-def-001">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-emerald-400">
                  View Log &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
