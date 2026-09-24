"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AirVent,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  Scan,
  Sparkles,
  Tv,
  UploadCloud,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";

export default function ElectricitySetupWizard() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const handleSimulateUpload = () => {
    setOcrProcessing(true);
    setTimeout(() => {
      setOcrProcessing(false);
      setStep(3);
    }, 1200);
  };

  const handleComplete = () => {
    if (household) {
      setSectionStatus(household.id, "electricity", "complete");
    }
    router.push("/citizen/electricity");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Electricity Setup & Baseline Wizard"
        subtitle="Map high-load appliances and historical consumption bills to establish your personal efficiency baseline."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Electricity Setup" },
        ]}
      />

      {/* Step Indicators */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/40 text-xs">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-emerald-400 font-bold" : "text-white/40"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-mono ${step >= 1 ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/5"}`}>1</div>
          <span>Appliance Inventory</span>
        </div>
        <div className="h-px w-8 bg-white/10" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-emerald-400 font-bold" : "text-white/40"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-mono ${step >= 2 ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/5"}`}>2</div>
          <span>Connect Bills</span>
        </div>
        <div className="h-px w-8 bg-white/10" />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-emerald-400 font-bold" : "text-white/40"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-mono ${step >= 3 ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/5"}`}>3</div>
          <span>Baseline Created</span>
        </div>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Appliance Checklist</h2>
              <p className="text-xs text-white/60">Selected items calibrate appliance-level disaggregation.</p>
            </div>
            <Link href="/citizen/scan">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-emerald-400">
                <Scan className="h-3.5 w-3.5" />
                <span>Barcode Scan</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: "Split Air Conditioner", desc: "1.5 Ton · 3 Star Inverter", defaultChecked: true },
              { name: "Ceiling Fans", desc: "4 units · 75W regular", defaultChecked: true },
              { name: "Refrigerator", desc: "260 L · Double door frost-free", defaultChecked: true },
              { name: "Storage Geyser", desc: "15 L · 2 kW heating coil", defaultChecked: true },
              { name: "LED Lighting", desc: "8 fixtures · 10W average", defaultChecked: true },
              { name: "Television & Audio", desc: "43 inch Smart LED TV", defaultChecked: true },
            ].map((app, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">{app.name}</div>
                  <div className="text-[11px] text-white/50">{app.desc}</div>
                </div>
                <div className="h-5 w-5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <button
              onClick={() => setStep(2)}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Skip detailed survey
            </button>
            <Button
              onClick={() => setStep(2)}
              className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 px-6 gap-2"
            >
              <span>Continue to Bill OCR</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Connect Your Electricity History</h2>
            <p className="text-xs text-white/60">
              Upload your recent GESCOM electricity bill or let our simulated OCR extract meter readings.
            </p>
          </div>

          <div
            onClick={handleSimulateUpload}
            className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer bg-white/[0.01] hover:bg-emerald-500/[0.02] transition-all"
          >
            {ocrProcessing ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3" />
                <span className="text-xs font-semibold text-white">Processing Simulated Bill OCR...</span>
                <span className="text-[10px] text-white/50 mt-1">Extracting units (kWh), tariff category, and billed amount</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-white">Click to Upload Electricity Bill (PDF/Image)</span>
                <span className="text-xs text-white/50 mt-1">Simulates instant extraction of 390 kWh for September 2026</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <button
              onClick={() => setStep(3)}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Skip bill upload — use default baseline
            </button>
            <Button
              onClick={handleSimulateUpload}
              disabled={ocrProcessing}
              className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 px-6 gap-2"
            >
              <span>Process Bill</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personalised Baseline Created</h2>
              <p className="text-xs text-emerald-400 font-medium">Calibrated against H-1024 history and Ward 24 peer norms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/40 border border-white/5 text-center">
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Baseline Band</span>
              <span className="text-base font-bold font-mono text-white">330 – 370 kWh</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Recorded Usage</span>
              <span className="text-base font-bold font-mono text-amber-400">390 kWh (+11.4%)</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Confidence Rating</span>
              <span className="text-base font-bold font-mono text-emerald-400">Medium (78%)</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleComplete}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-10 gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Open Electricity Intelligence Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
