"use client";

import { useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Layers, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function GovAnalyticsPage() {
  const [downloading, setDownloading] = useState(false);

  const handleExportCsv = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      toast.success("Raichur municipal multi-utility CSV report downloaded!");
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="City Analytics & Department Data Export"
        subtitle="Multi-stream historical analytics, ward participation trends, and downloadable CSV statements."
        actions={
          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={downloading}
            className="h-8 gap-1.5 bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloading ? "Compiling CSV..." : "Export City Analytics CSV"}</span>
          </Button>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        <h3 className="text-base font-bold text-white mb-2">Municipal Aggregated Summary (Q3 2026)</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">TOTAL POWER (Q3)</span>
            <span className="text-base font-bold text-white">49.2 GWh</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">TOTAL WATER (Q3)</span>
            <span className="text-base font-bold text-teal-400">1.06B Litres</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">TOTAL LPG (Q3)</span>
            <span className="text-base font-bold text-rose-400">165,000 kg</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">PARTICIPATION</span>
            <span className="text-base font-bold text-emerald-400">88.5% Homes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-xs text-white/60 leading-relaxed">
          Aggregated datasets comply with data anonymization guidelines. Individual household IDs and consumer serial numbers are excluded from municipal reporting exports.
        </div>
      </div>
    </div>
  );
}
