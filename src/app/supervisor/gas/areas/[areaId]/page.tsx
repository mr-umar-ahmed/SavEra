"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Info, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function AreaGasDetailsPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = use(params);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Area LPG Consumption Diagnostics (${areaId.toUpperCase()})`}
        subtitle="Granular cylinder turnover rates, historical trends, and distributor allocation models."
        breadcrumbs={[
          { label: "LPG Desk", href: "/supervisor/gas" },
          { label: areaId },
        ]}
        actions={
          <Link href="/supervisor/gas">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to LPG Desk</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Current Month Total"
          value="4,650 kg"
          subtitle="+14.2% vs baseline"
          badge={<StatusBadge status="warning" label="Elevated" />}
        />
        <KpiCard
          title="Average Burn Rate"
          value="0.68 kg / day"
          subtitle="Typical: 0.58 kg/day"
          badge={<StatusBadge status="warning" label="Above Normal" />}
        />
        <KpiCard
          title="Recommended Quota"
          value="340 Cylinders"
          subtitle="Buffer allocation"
          badge={<StatusBadge status="normal" label="Sufficient" />}
        />
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 space-y-3">
        <h3 className="text-sm font-bold text-white">Distributor Dispatch Action</h3>
        <p className="text-xs text-white/70 leading-relaxed">
          Local distributor Indane Gas Agency (Raichur Branch 2) has been notified to pre-stage 50 additional 14.2 kg domestic cylinders at the Ward 24 staging point to prevent refill stockouts.
        </p>
      </div>
    </div>
  );
}
