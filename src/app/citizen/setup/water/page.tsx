"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Droplet,
  Info,
  Layers,
  MapPin,
  Sparkles,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";

export default function WaterSetupPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);
  const updateHousehold = useDataStore((s) => s.updateHousehold);

  // 1. Usage points (multi-select) matching §1
  const [usagePoints, setUsagePoints] = useState<string[]>([
    "Kitchen tap",
    "Bathroom (2)",
    "Washing area",
    "Overhead tank",
    "RO purifier",
  ]);

  // 2. Area / supply zone
  const [areaZone] = useState("Ward 24 · XYZ Colony");

  // 3. Supply schedule (read-only from seed, editable)
  const [scheduleTime, setScheduleTime] = useState("7:00–8:00 AM · Daily");
  const [plannedLiters] = useState("4,50,000 L (colony)");

  // 4. Storage capacities
  const [overheadTank, setOverheadTank] = useState(1000);
  const [sumpCapacity, setSumpCapacity] = useState(2000);

  const toggleUsagePoint = (point: string) => {
    setUsagePoints((prev) =>
      prev.includes(point) ? prev.filter((p) => p !== point) : [...prev, point]
    );
  };

  const handleSave = () => {
    if (household) {
      setSectionStatus(household.id, "water", "complete");
      updateHousehold(household.id, {
        water: {
          usagePoints,
          storageLitres: overheadTank + sumpCapacity,
          source: "municipal",
          scheduleAreaId: "area-xyz",
        },
      });
    }
    toast.success("Water configuration saved.");
    router.push("/citizen/water");
  };

  const handleSkip = () => {
    if (household) {
      setSectionStatus(household.id, "water", "later");
    }
    toast.info("Using default XYZ Colony water norms.");
    router.push("/citizen/water");
  };

  const availablePoints = [
    "Kitchen tap",
    "Bathroom (2)",
    "Washing area",
    "Garden",
    "Overhead tank",
    "Borewell",
    "RO purifier",
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Water Setup"
        subtitle="Map usage points, storage capacity, and calculate regional scarcity impact."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Water Setup" },
        ]}
      />

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
        {/* 1. Usage Points */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              1. Household Usage Points &amp; Connections
            </label>
            <span className="text-xs font-mono text-teal-ink">
              {usagePoints.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {availablePoints.map((point) => {
              const isSelected = usagePoints.includes(point);
              return (
                <button
                  key={point}
                  type="button"
                  onClick={() => toggleUsagePoint(point)}
                  className={`p-3 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-ink font-semibold"
                      : "bg-muted border-border text-soft hover:bg-secondary"
                  }`}
                >
                  <span className="truncate">{point}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-teal-ink ml-1.5" />}
                </button>
              );
            })}
          </div>
          <SkipRow
            onSkip={() => setUsagePoints(["Kitchen tap", "Bathroom (2)", "Washing area"])}
            onLater={() => {}}
          />
        </div>

        {/* 2 & 3. Area / Supply Zone & Supply Schedule */}
        <div className="p-5 rounded-2xl bg-teal-500/[0.04] border border-teal-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-teal-ink uppercase tracking-wider flex items-center gap-1.5">
              <Droplet className="h-4 w-4" />
              <span>2. Supply Zone &amp; 3. Municipal Schedule</span>
            </span>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-ink">
              Pre-filled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-faint block font-sans mb-1">Area / Supply Zone:</span>
              <span className="text-sm font-bold text-foreground block">{areaZone}</span>
            </div>

            <div>
              <span className="text-faint block font-sans mb-1">Planned Supply Schedule:</span>
              <span className="text-sm font-bold text-positive block">{scheduleTime}</span>
              <span className="text-xs text-muted-foreground block font-sans mt-0.5">
                Planned: {plannedLiters}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Storage Capacities */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-foreground block">
            4. Water Storage Capacities
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Overhead Tank */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2">
              <span className="text-xs text-soft block">Overhead Tank Capacity</span>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 1500].map((litres) => (
                  <button
                    key={litres}
                    type="button"
                    onClick={() => setOverheadTank(litres)}
                    className={`py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                      overheadTank === litres
                        ? "bg-positive text-positive-foreground shadow-md shadow-positive/10"
                        : "bg-muted border-border text-soft hover:bg-secondary"
                    }`}
                  >
                    {litres} L
                  </button>
                ))}
              </div>
            </div>

            {/* Sump Capacity */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2">
              <span className="text-xs text-soft block">Underground Sump Capacity</span>
              <div className="grid grid-cols-3 gap-2">
                {[1500, 2000, 3000].map((litres) => (
                  <button
                    key={litres}
                    type="button"
                    onClick={() => setSumpCapacity(litres)}
                    className={`py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                      sumpCapacity === litres
                        ? "bg-positive text-positive-foreground shadow-md shadow-positive/10"
                        : "bg-muted border-border text-soft hover:bg-secondary"
                    }`}
                  >
                    {litres} L
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SkipRow
            onSkip={() => {
              setOverheadTank(1000);
              setSumpCapacity(2000);
            }}
            onLater={() => {}}
          />
        </div>

        {/* 5. Regional Scarcity Impact Card matching §1 verbatim */}
        <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-ink" />
              <span>5. Regional Scarcity Impact</span>
            </span>
            <EstimatedChip confidence="Medium" />
          </div>
          <p className="text-soft leading-relaxed">
            &ldquo;XYZ Colony is in a moderate-stress supply zone. Reporting your daily supply experience helps the ward balance supply.&rdquo;
          </p>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <SkipRow
            onSkip={handleSkip}
            onLater={handleSkip}
            label="All fields skippable · SAVERA applies standard XYZ Colony norms."
          />

          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-positive text-positive-foreground hover:bg-positive/90 font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-positive/10"
          >
            <span>Save &amp; Open Water Portal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
