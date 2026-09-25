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
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/20 text-positive font-semibold border border-positive/30">
            Onboarding Accelerator
          </span>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Select Appliance Barcode / Model</label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-xl bg-muted border border-border text-foreground text-xs p-3 focus:outline-none focus:border-positive"
          >
            {BARCODES.map((b) => (
              <option key={b.code} value={b.code} className="bg-background text-foreground">
                {b.code} — {b.brand} {b.model} ({b.star}★, {b.ratedWatts}W)
              </option>
            ))}
          </select>
        </div>

        {/* Matched Details */}
        <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{matched.brand} {matched.model}</span>
            <span className="text-xs font-mono font-bold text-positive">{matched.star} Star BEE Rating</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-muted">
              <span className="text-2xs text-faint block">RATED POWER</span>
              <span className="text-foreground font-bold">{matched.ratedWatts} W</span>
            </div>
            <div className="p-2 rounded bg-muted">
              <span className="text-2xs text-faint block">TYPE</span>
              <span className="text-foreground capitalize">{matched.type}</span>
            </div>
            <div className="p-2 rounded bg-muted">
              <span className="text-2xs text-faint block">INVERTER TECH</span>
              <span className="text-positive">{matched.inverter ? "Yes" : "Standard"}</span>
            </div>
            <div className="p-2 rounded bg-muted">
              <span className="text-2xs text-faint block">BARCODE EAN</span>
              <span className="text-soft">{matched.ean}</span>
            </div>
          </div>
        </div>

        {/* Usage inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-soft mb-1">Hours / Day</label>
            <Input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseInt(e.target.value) || 1)}
              className="bg-muted border-border text-foreground text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soft mb-1">Days / Month</label>
            <Input
              type="number"
              min={1}
              max={31}
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(parseInt(e.target.value) || 1)}
              className="bg-muted border-border text-foreground text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soft mb-1">Age in Service (Years)</label>
            <Input
              type="number"
              min={0}
              max={20}
              value={ageYears}
              onChange={(e) => setAgeYears(parseInt(e.target.value) || 0)}
              className="bg-muted border-border text-foreground text-xs font-mono"
            />
          </div>
        </div>

        {/* Calculated Monthly Impact */}
        <div className="p-4 rounded-xl bg-positive/10 border border-positive/20 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-positive block">Estimated Monthly Load Contribution</span>
            <span className="text-muted-foreground">Calculated via rated wattage and typical compressor duty cycle</span>
          </div>
          <span className="text-lg font-bold font-mono text-positive">~{estimatedMonthlyKwh} kWh/mo</span>
        </div>

        {/* Add button */}
        <Button
          onClick={handleAddAppliance}
          className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 gap-2"
        >
          <span>Add to Habitat Inventory</span>
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
