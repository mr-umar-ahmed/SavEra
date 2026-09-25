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
            className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloading ? "Compiling CSV..." : "Export City Analytics CSV"}</span>
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-6">
        <h3 className="text-base font-bold text-foreground mb-2">Municipal Aggregated Summary (Q3 2026)</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-inset border border-border/60">
            <span className="text-faint block text-2xs">TOTAL POWER (Q3)</span>
            <span className="text-base font-bold text-foreground">49.2 GWh</span>
          </div>
          <div className="p-3.5 rounded-xl bg-inset border border-border/60">
            <span className="text-faint block text-2xs">TOTAL WATER (Q3)</span>
            <span className="text-base font-bold text-teal-ink">1.06B Litres</span>
          </div>
          <div className="p-3.5 rounded-xl bg-inset border border-border/60">
            <span className="text-faint block text-2xs">TOTAL LPG (Q3)</span>
            <span className="text-base font-bold text-rose-ink">165,000 kg</span>
          </div>
          <div className="p-3.5 rounded-xl bg-inset border border-border/60">
            <span className="text-faint block text-2xs">PARTICIPATION</span>
            <span className="text-base font-bold text-positive">88.5% Homes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-muted/60 text-xs text-muted-foreground leading-relaxed">
          Aggregated datasets comply with data anonymization guidelines. Individual household IDs and consumer serial numbers are excluded from municipal reporting exports.
        </div>
      </div>
    </div>
  );
}
