"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Droplet, FileCheck, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function VerifiedReportsPage() {
  const verifiedList = [
    {
      id: "case-xyz-001",
      area: "XYZ Colony",
      reports: 78,
      verifiedBy: "Suresh M (Team 04)",
      deptAction: "Supply adjustment scheduled for tomorrow. New planned supply 7:00–8:15 AM.",
      status: "action_scheduled",
    },
    {
      id: "case-def-003",
      area: "DEF Colony",
      reports: 12,
      verifiedBy: "Arif Khan (Team 02)",
      deptAction: "Manifold pressure calibrated. Optimal delivery restored.",
      status: "resolved",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Verified Reports & Department Actions"
        subtitle="Historical audit log of on-ground validated water supply cases and municipal department interventions."
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: "Verified Reports" },
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

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl divide-y divide-white/5">
        {verifiedList.map((item) => (
          <div key={item.id} className="py-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono">{item.id}</span>
                <span className="text-white/50">· {item.area} ({item.reports} reports)</span>
              </div>
              <StatusBadge status="complete" label={item.status === "resolved" ? "Resolved" : "Action Scheduled"} />
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-white/60">Inspector: {item.verifiedBy}</div>
              <div className="text-emerald-400 font-medium">Department Response: {item.deptAction}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
