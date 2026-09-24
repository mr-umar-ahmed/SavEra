"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, QrCode, Scan, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BARCODES } from "@/data/catalogue/barcodes";
import { useDataStore } from "@/stores/data";
import { newId } from "@/lib/ids";
import { toast } from "sonner";

export default function SmartScanPage() {
  const upsertAppliance = useDataStore((s) => s.upsertAppliance);

  const [selectedCode, setSelectedCode] = useState(BARCODES[0].code);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [ageYears, setAgeYears] = useState(2);

  const matched = BARCODES.find((b) => b.code === selectedCode) ?? BARCODES[0];

  const estimatedMonthlyKwh = Math.round(
    ((matched.ratedWatts * (matched.inverter ? 0.55 : 0.75)) / 1000) * hoursPerDay * daysPerMonth
  );

  const handleAddAppliance = () => {
    upsertAppliance({
      id: newId("app"),
      householdId: "H-1024",
      type: matched.type,
      category: "cooling",
      label: `${matched.brand} ${matched.model}`,
      spec: {
        tonnage: matched.tonnage,
        star: matched.star,
        inverter: matched.inverter,
        ratedWatts: matched.ratedWatts,
      },
      count: 1,
      hoursPerDay,
      daysPerMonth,
      ageYears,
      setupStatus: "complete",
      source: "scan",
    });

    toast.success(`Added ${matched.brand} ${matched.model} to your appliance inventory!`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Smart Appliance Scan"
        subtitle="Onboarding accelerator: Match manufacturer ratings and BEE star labels instantly to improve baseline precision."
        badge={
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
            Onboarding Accelerator
          </span>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-white mb-2">Select Appliance Barcode / Model</label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-xs p-3 focus:outline-none focus:border-emerald-500"
          >
            {BARCODES.map((b) => (
              <option key={b.code} value={b.code} className="bg-[#050B08] text-white">
                {b.code} — {b.brand} {b.model} ({b.star}★, {b.ratedWatts}W)
              </option>
            ))}
          </select>
        </div>

        {/* Matched Details */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">{matched.brand} {matched.model}</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{matched.star} Star BEE Rating</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-white/5">
              <span className="text-[10px] text-white/40 block">RATED POWER</span>
              <span className="text-white font-bold">{matched.ratedWatts} W</span>
            </div>
            <div className="p-2 rounded bg-white/5">
              <span className="text-[10px] text-white/40 block">TYPE</span>
              <span className="text-white capitalize">{matched.type}</span>
            </div>
            <div className="p-2 rounded bg-white/5">
              <span className="text-[10px] text-white/40 block">INVERTER TECH</span>
              <span className="text-emerald-400">{matched.inverter ? "Yes" : "Standard"}</span>
            </div>
            <div className="p-2 rounded bg-white/5">
              <span className="text-[10px] text-white/40 block">BARCODE EAN</span>
              <span className="text-white/70">{matched.ean}</span>
            </div>
          </div>
        </div>

        {/* Usage inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Hours / Day</label>
            <Input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseInt(e.target.value) || 1)}
              className="bg-white/5 border-white/10 text-white text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Days / Month</label>
            <Input
              type="number"
              min={1}
              max={31}
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(parseInt(e.target.value) || 1)}
              className="bg-white/5 border-white/10 text-white text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Age in Service (Years)</label>
            <Input
              type="number"
              min={0}
              max={20}
              value={ageYears}
              onChange={(e) => setAgeYears(parseInt(e.target.value) || 0)}
              className="bg-white/5 border-white/10 text-white text-xs font-mono"
            />
          </div>
        </div>

        {/* Calculated Monthly Impact */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-emerald-300 block">Estimated Monthly Load Contribution</span>
            <span className="text-white/60">Calculated via rated wattage and typical compressor duty cycle</span>
          </div>
          <span className="text-lg font-bold font-mono text-emerald-400">~{estimatedMonthlyKwh} kWh/mo</span>
        </div>

        {/* Add button */}
        <Button
          onClick={handleAddAppliance}
          className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 gap-2"
        >
          <span>Add to Habitat Inventory</span>
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
