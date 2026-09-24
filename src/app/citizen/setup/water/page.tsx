"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Droplet, Waves } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";

export default function WaterSetupPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const [sumpLitres, setSumpLitres] = useState(3000);
  const [overheadLitres, setOverheadLitres] = useState(1000);
  const [hasPurifier, setHasPurifier] = useState(true);

  const handleSave = () => {
    if (household) {
      setSectionStatus(household.id, "water", "complete");
    }
    router.push("/citizen/water");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Water Supply & Habitat Setup"
        subtitle="Map your supply schedule, storage capacity, and regional scarcity factors."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Water Setup" },
        ]}
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        {/* Scheduled Supply Card */}
        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Droplet className="h-4 w-4" />
            <span>Assigned Municipal Schedule</span>
          </div>
          <div className="text-sm font-semibold text-white">XYZ Colony, Ward 24 · Raichur Water Board</div>
          <p className="text-xs text-white/60 mt-0.5">
            Planned Delivery: <span className="text-emerald-400 font-mono font-medium">Daily 7:00 AM – 8:00 AM</span> (~450 L allocated per household)
          </p>
        </div>

        {/* Storage Capacity */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">Underground Sump Capacity</label>
          <div className="grid grid-cols-3 gap-2.5">
            {[2000, 3000, 5000].map((litres) => (
              <button
                key={litres}
                type="button"
                onClick={() => setSumpLitres(litres)}
                className={`p-3 rounded-xl text-xs font-mono font-medium text-left border transition-all ${
                  sumpLitres === litres
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {litres.toLocaleString()} Litres
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white mb-2">Overhead Tank Storage</label>
          <div className="grid grid-cols-3 gap-2.5">
            {[500, 1000, 1500].map((litres) => (
              <button
                key={litres}
                type="button"
                onClick={() => setOverheadLitres(litres)}
                className={`p-3 rounded-xl text-xs font-mono font-medium text-left border transition-all ${
                  overheadLitres === litres
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {litres.toLocaleString()} Litres
              </button>
            ))}
          </div>
        </div>

        {/* Purifier / Backup */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">RO / UV Purifier Installed</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHasPurifier(true)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                hasPurifier
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              Yes (RO Water Purifier)
            </button>
            <button
              type="button"
              onClick={() => setHasPurifier(false)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                !hasPurifier
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              No (Direct Tap / Filter)
            </button>
          </div>
        </div>

        {/* Action */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>Save & Go to Water Portal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
