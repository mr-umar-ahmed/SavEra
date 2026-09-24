"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Flame, History } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";

export default function LpgHistoryPage() {
  const pastCycles = [
    { id: "cyl-01", start: "12 Aug 2026", finish: "06 Sep 2026", days: 25, rate: "0.568 kg/d", size: "14.2 kg", status: "Finished" },
    { id: "cyl-02", start: "18 Jul 2026", finish: "11 Aug 2026", days: 24, rate: "0.591 kg/d", size: "14.2 kg", status: "Finished" },
    { id: "cyl-03", start: "22 Jun 2026", finish: "17 Jul 2026", days: 25, rate: "0.568 kg/d", size: "14.2 kg", status: "Finished" },
    { id: "cyl-04", start: "27 May 2026", finish: "21 Jun 2026", days: 25, rate: "0.568 kg/d", size: "14.2 kg", status: "Finished" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="LPG Cylinder History"
        subtitle="Historical log of domestic cylinder cycles, duration in days, and calculated daily burn rates."
        breadcrumbs={[
          { label: "LPG Dashboard", href: "/citizen/gas" },
          { label: "History" },
        ]}
        actions={
          <Link href="/citizen/gas">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to LPG</span>
            </Button>
          </Link>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-left font-mono">
                <th className="pb-3 font-medium">CYLINDER ID</th>
                <th className="pb-3 font-medium">START DATE</th>
                <th className="pb-3 font-medium">FINISH DATE</th>
                <th className="pb-3 font-medium">DAYS USED</th>
                <th className="pb-3 font-medium">DAILY RATE</th>
                <th className="pb-3 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {pastCycles.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-bold text-white">{c.id}</td>
                  <td className="py-3 text-white/70">{c.start}</td>
                  <td className="py-3 text-white/70">{c.finish}</td>
                  <td className="py-3 text-emerald-400 font-bold">{c.days} days</td>
                  <td className="py-3 text-white/80">{c.rate}</td>
                  <td className="py-3 text-white/50">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
