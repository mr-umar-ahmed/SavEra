"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  Droplet,
  FileText,
  Flame,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UtilityServicesHubPage() {
  const [electricityPaid, setElectricityPaid] = useState(false);
  const [waterPaid, setWaterPaid] = useState(false);
  const [payingElectricity, setPayingElectricity] = useState(false);
  const [payingWater, setPayingWater] = useState(false);

  const handlePayElectricity = () => {
    setPayingElectricity(true);
    setTimeout(() => {
      setPayingElectricity(false);
      setElectricityPaid(true);
      toast.success("Electricity bill paid! Simulated BBPS transaction #TXN-EL-99042");
    }, 1200);
  };

  const handlePayWater = () => {
    setPayingWater(true);
    setTimeout(() => {
      setPayingWater(false);
      setWaterPaid(true);
      toast.success("Municipal water charges paid! Simulated transaction #TXN-WT-44102");
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Utility Services Hub"
        subtitle="One-stop civic utility desk: Settle electricity bills, pay municipal water charges, and schedule LPG refills."
        badge={<StatusBadge status="simulation" label="Simulated BBPS Sandbox" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bill 1: Electricity */}
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="h-4 w-4" />
                <span>GESCOM Electricity Bill</span>
              </div>
              <span className="text-xs font-mono text-white/50">Sep 2026</span>
            </div>

            <div className="text-2xl font-bold font-mono text-white mb-1">₹3,120</div>
            <p className="text-xs text-white/60 mb-4">390 kWh recorded · Due date: 05 October 2026</p>
          </div>

          <div className="pt-4 border-t border-white/5">
            {electricityPaid ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Paid (Ref: TXN-EL-99042)</span>
              </div>
            ) : (
              <Button
                onClick={handlePayElectricity}
                disabled={payingElectricity}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 gap-2"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>{payingElectricity ? "Authorizing Payment..." : "Pay Bill (Simulated ₹3,120)"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Bill 2: Water Supply */}
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Droplet className="h-4 w-4" />
                <span>Raichur Municipal Water Tax</span>
              </div>
              <span className="text-xs font-mono text-white/50">Q3 2026</span>
            </div>

            <div className="text-2xl font-bold font-mono text-white mb-1">₹450</div>
            <p className="text-xs text-white/60 mb-4">Fixed quarterly residential cess · Due: 15 Oct 2026</p>
          </div>

          <div className="pt-4 border-t border-white/5">
            {waterPaid ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Paid (Ref: TXN-WT-44102)</span>
              </div>
            ) : (
              <Button
                onClick={handlePayWater}
                disabled={payingWater}
                className="w-full bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 gap-2"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>{payingWater ? "Processing Payment..." : "Pay Water Tax (Simulated ₹450)"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
