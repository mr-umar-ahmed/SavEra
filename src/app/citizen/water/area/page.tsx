"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  Info,
  MapPin,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";

export default function AreaWaterStatusPage() {
  const waterCases = useDataStore((s) => s.waterCases);
  const currentCase = waterCases.find((c) => c.areaId === "area-xyz") ?? waterCases[0];

  const caseState = currentCase?.state ?? "under_review";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Area Water Supply Status"
        subtitle="Aggregated community supply intelligence and verified municipal inspection telemetry."
        breadcrumbs={[
          { label: "Water Portal", href: "/citizen/water" },
          { label: "Area Status" },
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

      {/* Main Status & Breakdown Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider font-mono">
              <MapPin className="h-4 w-4" />
              <span>XYZ Colony · Ward 24</span>
            </div>
            <StatusBadge
              status="danger"
              label="🔴 Concern detected — under verification"
            />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">
              Area Status: Concern Detected — Under Verification
            </h3>
            <p className="text-xs text-white/70 leading-relaxed mt-1 font-mono">
              78 participating households in XYZ Colony reported during this morning&apos;s 7:00–8:00 AM supply window.
            </p>
          </div>

          {/* Aggregated reports today matching §5 verbatim */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-teal-400 tracking-wider">
                Aggregated Reports Today: 78 Total
              </span>
              <span className="text-[10px] text-white/40 font-mono">Anonymized Counts Only</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xl font-bold text-emerald-400 block">18</span>
                <span className="text-[10px] text-white/50 block font-sans mt-0.5">Sufficient</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xl font-bold text-rose-400 block">61</span>
                <span className="text-[10px] text-white/50 block font-sans mt-0.5">
                  Insufficient / Low
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xl font-bold text-amber-400 block">11</span>
                <span className="text-[10px] text-white/50 block font-sans mt-0.5">Low Pressure</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xl font-bold text-amber-400 block">6</span>
                <span className="text-[10px] text-white/50 block font-sans mt-0.5">
                  Short Duration
                </span>
              </div>
            </div>
          </div>

          {/* AI Pattern Analysis matching §5 verbatim */}
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200 space-y-1">
            <span className="font-bold block text-white flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-400" />
              <span>Concern Detected? Yes</span>
            </span>
            <p className="text-white/70 leading-relaxed">
              &ldquo;Possible supply-demand gap identified by AI. Supervisor review in progress.&rdquo;
            </p>
          </div>
        </div>

        {/* Latest Verified Update Card matching §5 */}
        <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-3 font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>Latest Verified Update</span>
            </div>

            <h4 className="text-base font-bold text-white mb-2">
              Physical Field Verification
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-mono">
              &ldquo;Field verification completed 7:42 AM — low pressure observed on streets A, B, C.&rdquo;
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-[11px] font-mono text-white/60">
              <div>• Inspector: Ravi Kumar</div>
              <div>• Tested: 0.8 bar at manifold</div>
              <div>• Status: Escalated to Board</div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4 text-[11px] text-white/40 font-mono">
            Next planned supply window: Tomorrow 7:00 AM – 8:15 AM
          </div>
        </div>
      </div>

      {/* Planned Supply Card & 7-Day History Strip matching §5 */}
      <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/90 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <h4 className="text-base font-bold text-white">Planned Supply &amp; 7-Day History Strip</h4>
            <p className="text-xs text-white/50 font-mono">
              XYZ Colony Feeder Line 4B · 4,50,000 L Planned Daily Allocation
            </p>
          </div>
          <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            7:00 AM – 8:00 AM Daily
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono">
          {[
            { day: "Fri 19", status: "Nominal", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
            { day: "Sat 20", status: "Nominal", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
            { day: "Sun 21", status: "Nominal", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
            { day: "Mon 22", status: "Nominal", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
            { day: "Tue 23", status: "Nominal", tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
            { day: "Wed 24", status: "Minor lag", tone: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
            { day: "Thu 25", status: "Concern", tone: "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold" },
          ].map((d) => (
            <div key={d.day} className={`p-3 rounded-2xl border ${d.tone} flex flex-col justify-between`}>
              <span className="text-[10px] text-white/50">{d.day}</span>
              <span className="text-xs my-1 font-bold">{d.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
