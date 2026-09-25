"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Home, Shield, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";
import type { HomeType } from "@/types";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const updateHousehold = useDataStore((s) => s.updateHousehold);
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  // Seed values from H-1024
  const [name, setName] = useState("Priya Sharma");
  const [mobile, setMobile] = useState("9000000001");
  const [locationPin, setLocationPin] = useState("Raichur · 584101");
  const [wardArea, setWardArea] = useState("Ward 24 · XYZ Colony");
  const [provider, setProvider] = useState("Electricity Department (Raichur)");
  const [consumerCategory, setConsumerCategory] = useState<"domestic" | "commercial" | "other">(
    "domestic"
  );
  const [people, setPeople] = useState(household?.people ?? 4);
  const [homeType, setHomeType] = useState<HomeType>(household?.homeType ?? "2BHK");
  const [homeSize, setHomeSize] = useState("850");
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
    toast.success("Household details saved.");
    router.push("/citizen/setup/electricity");
  };

  const handleSkipAll = () => {
    if (household) {
      setSectionStatus(household.id, "household", "later");
    }
    toast.info("Using default H-1024 Ward 24 configuration");
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

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
        {/* Name and Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted border-border text-xs text-foreground h-10 rounded-xl"
            />
            <SkipRow
              onSkip={() => setName("Priya Sharma")}
              onLater={() => {}}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Mobile Number</label>
            <Input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="bg-muted border-border text-xs text-foreground h-10 rounded-xl font-mono"
            />
            <SkipRow
              onSkip={() => setMobile("9000000001")}
              onLater={() => {}}
              className="mt-1"
            />
          </div>
        </div>

        {/* Location / PIN and Ward / Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Location / PIN</label>
            <Input
              type="text"
              value={locationPin}
              onChange={(e) => setLocationPin(e.target.value)}
              className="bg-muted border-border text-xs text-foreground h-10 rounded-xl"
            />
            <SkipRow
              onSkip={() => setLocationPin("Raichur · 584101")}
              onLater={() => {}}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Ward / Area</label>
            <select
              value={wardArea}
              onChange={(e) => setWardArea(e.target.value)}
              className="w-full bg-background border border-border text-xs text-foreground h-10 rounded-xl px-3 outline-none"
            >
              <option value="Ward 24 · XYZ Colony">Ward 24 · XYZ Colony</option>
              <option value="Ward 24 · ABC Colony">Ward 24 · ABC Colony</option>
              <option value="Ward 24 · DEF Colony">Ward 24 · DEF Colony</option>
              <option value="Ward 24 · GHI Colony">Ward 24 · GHI Colony</option>
            </select>
            <SkipRow
              onSkip={() => setWardArea("Ward 24 · XYZ Colony")}
              onLater={() => {}}
              className="mt-1"
            />
          </div>
        </div>

        {/* Electricity Provider */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Electricity Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-background border border-border text-xs text-foreground h-10 rounded-xl px-3 outline-none"
          >
            <option value="Electricity Department (Raichur)">
              Electricity Department (Raichur)
            </option>
            <option value="State Power Utility">State Power Utility</option>
          </select>
        </div>

        {/* Consumer Category */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Consumer Category</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: "domestic", label: "Domestic (LT-2)" },
              { id: "commercial", label: "Commercial" },
              { id: "other", label: "Other" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setConsumerCategory(cat.id as typeof consumerCategory)}
                className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  consumerCategory === cat.id
                    ? "bg-positive/15 border-positive/40 text-positive font-semibold"
                    : "bg-muted border-border text-soft hover:bg-secondary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <SkipRow
            onSkip={() => setConsumerCategory("domestic")}
            onLater={() => {}}
            className="mt-1"
          />
        </div>

        {/* Occupancy Stepper */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-foreground">Number of People</label>
            <span className="text-xs font-mono text-positive font-bold">{people} residents</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPeople(num)}
                className={`h-10 w-11 rounded-xl text-xs font-mono font-bold transition-all ${
                  people === num
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                    : "bg-muted border border-border text-soft hover:bg-secondary"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <SkipRow onSkip={() => setPeople(4)} onLater={() => {}} className="mt-1" />
        </div>

        {/* Home Type and Size */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">Home Type / Layout</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: "1BHK" as const, label: "1BHK" },
              { id: "2BHK" as const, label: "2BHK (Primary)" },
              { id: "3BHK" as const, label: "3BHK" },
              { id: "independent" as const, label: "Independent" },
              { id: "villa" as const, label: "Villa" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setHomeType(t.id)}
                className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  homeType === t.id
                    ? "bg-positive/15 border-positive/40 text-positive font-semibold"
                    : "bg-muted border-border text-soft hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-soft">Estimated Floor Size:</span>
            <div className="flex items-center gap-1.5 w-32">
              <Input
                type="number"
                value={homeSize}
                onChange={(e) => setHomeSize(e.target.value)}
                className="bg-muted border-border text-xs text-foreground h-8 font-mono"
              />
              <span className="text-xs text-muted-foreground font-mono">sq ft</span>
            </div>
          </div>
          <SkipRow
            onSkip={() => {
              setHomeType("2BHK");
              setHomeSize("850");
            }}
            onLater={() => {}}
            className="mt-1"
          />
        </div>

        {/* Renewable Energy */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">
            Renewable Energy Opted
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: "none", label: "None (Grid Only)" },
              { id: "rooftop_solar", label: "Rooftop Solar PV" },
              { id: "solar_water_heater", label: "Solar Water Heater" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRenewable(r.id as typeof renewable)}
                className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  renewable === r.id
                    ? "bg-positive/15 border-positive/40 text-positive font-semibold"
                    : "bg-muted border-border text-soft hover:bg-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <SkipRow onSkip={() => setRenewable("none")} onLater={() => {}} className="mt-1" />
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <SkipRow
            onSkip={handleSkipAll}
            onLater={handleSkipAll}
            label="You can skip and SAVERA will apply default Ward 24 2BHK norms."
          />

          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
          >
            <span>Continue to Home Energy Setup</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
