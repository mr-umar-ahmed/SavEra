"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Home, Shield, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";
import type { HomeType } from "@/types";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const updateHousehold = useDataStore((s) => s.updateHousehold);
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const [people, setPeople] = useState(household?.people ?? 4);
  const [homeType, setHomeType] = useState<HomeType>(household?.homeType ?? "3BHK");
  const [renewable, setRenewable] = useState(household?.renewable ?? "none");

  const handleSave = () => {
    if (household) {
      updateHousehold(household.id, {
        people,
        homeType,
        renewable,
      });
      setSectionStatus(household.id, "household", "complete");
    }
    router.push("/citizen/setup/electricity");
  };

  const handleSkip = () => {
    if (household) {
      setSectionStatus(household.id, "household", "later");
    }
    router.push("/citizen/setup/electricity");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Household Details"
        subtitle="Basic habitat specifications calibrate personal consumption baselines and peer group rankings."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Household Setup" },
        ]}
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        {/* Occupancy */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">
            Number of Residents (Occupants)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPeople(num)}
                className={`h-10 w-12 rounded-xl text-xs font-mono font-bold transition-all ${
                  people === num
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Home Type */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">Habitat Type & Layout</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "1BHK" as const, label: "1 BHK Flat" },
              { id: "2BHK" as const, label: "2 BHK Flat" },
              { id: "3BHK" as const, label: "3 BHK Apartment" },
              { id: "independent" as const, label: "Independent House" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setHomeType(t.id)}
                className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  homeType === t.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location / Utility Provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">Municipality & Ward</label>
            <Input
              disabled
              value="Ward 24 (XYZ Colony), Raichur"
              className="bg-white/5 border-white/10 text-xs text-white/80"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">Electricity Provider</label>
            <Input
              disabled
              value="Electricity Department (GESCOM Grid)"
              className="bg-white/5 border-white/10 text-xs text-white/80"
            />
          </div>
        </div>

        {/* Renewable Energy */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">Renewable Energy Installation</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: "none", label: "None / Grid Power Only" },
              { id: "rooftop_solar", label: "Rooftop Solar PV" },
              { id: "solar_water_heater", label: "Solar Water Heater" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRenewable(r.id as typeof renewable)}
                className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  renewable === r.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SkipRow
            onSkip={handleSkip}
            label="You can skip and SAVERA will apply default Ward 24 3BHK norms."
          />

          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>Save & Proceed to Electricity</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
