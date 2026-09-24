"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Droplet, MapPin, ShieldAlert, Waves } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function AreaWaterReportPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = use(params);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Area Water Supply Telemetry Report"
        subtitle={`Detailed diagnostics, feedback split, and feeder pressure telemetry for ${areaId}.`}
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: areaId },
        ]}
        actions={
          <Link href="/supervisor/water">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Desk</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">
              Locality Telemetry
            </span>
            <StatusBadge status="danger" label="Supply-Demand Gap Flagged" />
          </div>

          <h3 className="text-xl font-bold text-white">XYZ Colony (Ward 24)</h3>
          <p className="text-xs text-white/70 leading-relaxed">
            Feeder Line 4B delivered sub-standard pressure during the assigned morning distribution window. 78 out of 1,240 households logged verified experience reports.
          </p>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 text-xs">
            <span className="font-semibold text-white/80 block">Citizen Response Split (Total 78 reports):</span>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-lg font-bold text-amber-400 block">61</span>
                <span className="text-[10px] text-white/50">Low Pressure</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-lg font-bold text-amber-400 block">11</span>
                <span className="text-[10px] text-white/50">Short Duration</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-lg font-bold text-rose-400 block">6</span>
                <span className="text-[10px] text-white/50">No Water</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
            <span className="font-bold block mb-1">AI Diagnostic Assessment</span>
            <p className="text-white/70">
              Possible supply-demand gap. The aggregate pressure drop is localized between Sector 2 and Sector 4 junction points.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-white/40 uppercase tracking-wider block font-mono mb-2">Linked Case</span>
            <h4 className="text-sm font-bold text-white mb-2">Case XYZ-001</h4>
            <p className="text-xs text-white/60 mb-4">
              Currently assigned to Field Assistant Suresh M (Team 04) for pressure validation.
            </p>
          </div>

          <Link href="/supervisor/water/cases/case-xyz-001">
            <Button className="w-full bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 gap-1.5">
              <span>Open Case Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
