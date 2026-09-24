"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Droplet, MapPin, ShieldCheck, Users, Waves } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function AreaWaterStatusPage() {
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
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Portal</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Status */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <MapPin className="h-4 w-4" />
              <span>XYZ Colony · Ward 24</span>
            </div>
            <StatusBadge status="warning" label="Reduced Pressure Observed" />
          </div>

          <h3 className="text-xl font-bold text-white">Area Status: Active Field Investigation</h3>
          <p className="text-xs text-white/70 leading-relaxed">
            78 participating households in XYZ Colony reported reduced water pressure during this morning&apos;s 7:00 AM – 8:00 AM supply window.
          </p>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider block">Citizen Feedback Breakdown</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-base font-bold font-mono text-amber-400 block">61</span>
                <span className="text-[10px] text-white/50">Low Pressure</span>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-base font-bold font-mono text-amber-400 block">11</span>
                <span className="text-[10px] text-white/50">Short Duration</span>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-base font-bold font-mono text-rose-400 block">6</span>
                <span className="text-[10px] text-white/50">No Water</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
            <span className="font-bold block mb-1">AI Area Pattern Analysis</span>
            <p className="text-white/70">
              Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area&apos;s planned supply and historical pattern. Supervisor verification assigned to Team 04.
            </p>
          </div>
        </div>

        {/* Latest Verified Update */}
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified Desk Update</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">Field Team Inspection</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Field Assistant Suresh M has verified 0.8 bar pressure (normal: 1.4 bar) at the Sector 2 junction valve. Water Department notified for scheduled pressure adjustment.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-white/40">
            Next scheduled supply: Tomorrow 7:00 AM – 8:15 AM (Extended by 15 mins).
          </div>
        </div>
      </div>
    </div>
  );
}
