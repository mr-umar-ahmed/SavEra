"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flame } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";

export default function GasSetupPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const [gasType, setGasType] = useState<"lpg" | "piped">("lpg");
  const [cylinderSize, setCylinderSize] = useState(14.2);
  const [provider, setProvider] = useState("Indane Gas (IOCL)");

  const handleSave = () => {
    if (household) {
      setSectionStatus(household.id, "gas", "complete");
    }
    router.push("/citizen/gas");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="LPG & Cooking Gas Setup"
        subtitle="Configure your fuel supply type, cylinder weight, and authorized distributor."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Gas Setup" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Fuel Delivery Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGasType("lpg")}
              className={`p-4 rounded-xl text-left border transition-all ${
                gasType === "lpg"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                  : "bg-muted border-border text-soft"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                <Flame className="h-4 w-4" />
                <span>LPG Cylinders (Bottled Gas)</span>
              </div>
              <p className="text-xs text-muted-foreground">Standard domestic refillable cylinders</p>
            </button>

            <button
              type="button"
              onClick={() => setGasType("piped")}
              className={`p-4 rounded-xl text-left border transition-all ${
                gasType === "piped"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                  : "bg-muted border-border text-soft"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                <Flame className="h-4 w-4" />
                <span>Piped Natural Gas (PNG)</span>
              </div>
              <p className="text-xs text-muted-foreground">Municipal pipeline connection</p>
            </button>
          </div>
        </div>

        {gasType === "lpg" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Cylinder Weight (Capacity)</label>
              <div className="grid grid-cols-2 gap-3">
                {[14.2, 5.0].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCylinderSize(size)}
                    className={`p-3 rounded-xl text-xs font-mono font-medium text-left border transition-all ${
                      cylinderSize === size
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                        : "bg-muted border-border text-soft"
                    }`}
                  >
                    {size} kg (Standard Domestic)
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Distribution Agency / Brand</label>
              <div className="grid grid-cols-3 gap-2.5">
                {["Indane Gas (IOCL)", "Bharat Gas (BPCL)", "HP Gas (HPCL)"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                      provider === p
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                        : "bg-muted border-border text-soft"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>Save & Open LPG Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
