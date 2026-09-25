"use client";

import { useState } from "react";
import {
  Car,
  CheckCircle2,
  ChevronDown,
  Globe,
  Info,
  Leaf,
  PieChart,
  Plane,
  Sparkles,
  TrendingDown,
  Utensils,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function CarbonFootprintPage() {
  const [commuteKm, setCommuteKm] = useState(80);
  const [diet, setDiet] = useState<"veg" | "mixed" | "non-veg">("veg");
  const [flights, setFlights] = useState(1);

  // Calibrated emission estimation (annual tCO2e)
  const electricityT = 3.8;
  const lpgT = 0.5;
  const commuteT = ((commuteKm * 52 * 0.12) / 1000).toFixed(1);
  const dietT = diet === "veg" ? 1.2 : diet === "mixed" ? 1.8 : 2.4;
  const flightT = flights * 0.4;

  const totalTco2e = (electricityT + lpgT + parseFloat(commuteT) + dietT + flightT).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carbon Footprint Analyzer"
        subtitle="Holistic ecological footprint analysis mapping domestic energy, commuting, and lifestyle habits."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/20 text-positive font-semibold border border-positive/30">
              New ESG Framework
            </span>
            <EstimatedChip confidence="Medium" />
          </div>
        }
      />

      {/* Top Impact KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Annual Emissions"
          value={`${totalTco2e} tCO₂e / yr`}
          subtitle="Household H-1024 aggregate"
          badge={<StatusBadge status="normal" label="18% Below Peer Avg" />}
        />

        <KpiCard
          title="Electricity Grid Scope 2"
          value="3.8 tCO₂e"
          subtitle="Based on 0.82 kg CO₂/kWh"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="Domestic LPG Scope 1"
          value="0.5 tCO₂e"
          subtitle="Based on 2.98 kg CO₂/kg LPG"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="Transport & Lifestyle"
          value={`${(parseFloat(commuteT) + flightT + dietT).toFixed(1)} tCO₂e`}
          subtitle="Commute, diet & aviation"
          badge={<EstimatedChip confidence="Medium" />}
        />
      </div>

      {/* Interactive Questionnaire & Disaggregation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lifestyle Inputs Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground mb-1">Lifestyle & Mobility Parameters</h3>
            <p className="text-xs text-muted-foreground">
              Adjust your commuting and consumption patterns to recalculate your greenhouse gas emissions profile.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-soft">Weekly Commuting Distance (km/week)</span>
                <span className="text-positive font-mono font-bold">{commuteKm} km/week</span>
              </div>
              <div className="flex gap-2">
                {[40, 80, 150, 250].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setCommuteKm(km)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium border ${
                      commuteKm === km ? "bg-primary text-primary-foreground font-bold" : "bg-muted border-border text-soft"
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-soft mb-1.5">Dietary Profile</span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "veg", label: "Vegetarian / Plant-rich" },
                  { id: "mixed", label: "Flexitarian / Moderate" },
                  { id: "non-veg", label: "Non-Vegetarian Daily" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiet(d.id as typeof diet)}
                    className={`p-3 rounded-xl text-xs font-medium border text-left ${
                      diet === d.id ? "bg-positive/15 border-positive/40 text-positive" : "bg-muted border-border text-soft"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-soft mb-1.5">Domestic Aviation Flights / Year</span>
              <div className="flex gap-2">
                {[0, 1, 2, 4].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlights(f)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium border ${
                      flights === f ? "bg-primary text-primary-foreground font-bold" : "bg-muted border-border text-soft"
                    }`}
                  >
                    {f} {f === 1 ? "flight" : "flights"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ESG Reduction Strategies */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Ranked ESG Strategies</span>
            </div>
            <h4 className="text-sm font-bold text-foreground mb-3">Targeted Decarbonization</h4>

            <div className="space-y-3">
              {[
                { title: "Rooftop Solar Opt-In", saving: "2.4 tCO₂e / yr", desc: "4 kW rooftop system covers 75% of grid demand." },
                { title: "Smart Thermostat Setpoint", saving: "0.3 tCO₂e / yr", desc: "Setting AC to 26°C avoids unnecessary compressor run." },
                { title: "Commute Transit Shift", saving: "0.2 tCO₂e / yr", desc: "Replacing 2 driving days with shared metro transit." },
              ].map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-muted/60 border border-border/60 text-xs">
                  <div className="flex justify-between font-semibold text-foreground mb-0.5">
                    <span>{s.title}</span>
                    <span className="text-positive font-mono">{s.saving}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 text-xs text-faint flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-faint" />
            <span>Emission factors calibrated via CEA CO₂ Baseline Database India.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
