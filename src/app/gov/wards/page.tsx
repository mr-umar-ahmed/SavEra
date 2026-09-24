"use client";

import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function GovWardsPage() {
  const wards = [
    { id: "ward-24", name: "Ward 24 (Central West)", households: 4820, waterStatus: "danger", gasStatus: "warning", elStatus: "warning", trend: "Increasing 🔴" },
    { id: "ward-18", name: "Ward 18 (North Sector)", households: 4100, waterStatus: "warning", gasStatus: "normal", elStatus: "normal", trend: "Stable 🟢" },
    { id: "ward-11", name: "Ward 11 (Industrial Feeder)", households: 3950, waterStatus: "normal", gasStatus: "normal", elStatus: "normal", trend: "Normal 🟡" },
    { id: "ward-07", name: "Ward 07 (South Residential)", households: 3600, waterStatus: "normal", gasStatus: "normal", elStatus: "normal", trend: "Stable 🟢" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Ward & Area Comparative Benchmarking"
        subtitle="Cross-ward resource demand indices, participation rates, and geographic stress metrics."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="Privacy-Preserving Aggregates" />
            <span className="text-xs font-mono text-white/50">Zero Citizen PII</span>
          </div>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4">Municipal Ward Standings</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-left font-mono">
                <th className="pb-3 font-medium">WARD</th>
                <th className="pb-3 font-medium">PARTICIPATING HOMES</th>
                <th className="pb-3 font-medium">WATER STATUS</th>
                <th className="pb-3 font-medium">LPG STATUS</th>
                <th className="pb-3 font-medium">GRID LOAD</th>
                <th className="pb-3 font-medium">DEMAND TREND</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {wards.map((w) => (
                <tr key={w.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 font-bold text-white font-sans">{w.name}</td>
                  <td className="py-3.5 text-white/70">{w.households.toLocaleString()}</td>
                  <td className="py-3.5">
                    <StatusBadge status={w.waterStatus as "normal" | "warning" | "danger"} />
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={w.gasStatus as "normal" | "warning" | "danger"} />
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={w.elStatus as "normal" | "warning" | "danger"} />
                  </td>
                  <td className="py-3.5 font-bold text-white font-sans">{w.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
