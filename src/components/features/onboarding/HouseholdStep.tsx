"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Home, Plug, Sun, SunMedium } from "lucide-react";
import { toast } from "sonner";
import { ChoiceGrid, type ChoiceOption } from "@/components/savera/ChoiceGrid";
import { SkipRow } from "@/components/savera/SkipRow";
import { EyebrowPill } from "@/components/features/landing/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from "@/stores/data";
import type { Area, HomeType, Household, Renewable } from "@/types";
import { StepShell } from "./StepShell";
import { AsideTips, CountStepper, FieldLabel } from "./OnboardingPrimitives";

export interface HouseholdStepProps {
  household: Household;
  wardLabel: string;
  onSaved: () => void;
  onSkip: () => void;
}

type HomeChoice = Exclude<HomeType, "other">;

const HOME_OPTIONS: ReadonlyArray<ChoiceOption<HomeChoice>> = [
  { value: "1BHK", label: "1 BHK", description: "Compact flat" },
  { value: "2BHK", label: "2 BHK", description: "Most common in Ward 24" },
  { value: "3BHK", label: "3 BHK", description: "Larger flat" },
  { value: "independent", label: "Independent house", description: "Own building" },
  { value: "villa", label: "Villa", description: "Large home, garden" },
];

const RENEWABLE_OPTIONS: ReadonlyArray<ChoiceOption<Renewable>> = [
  { value: "none", label: "None", description: "Grid only", icon: Plug },
  { value: "rooftop_solar", label: "Rooftop solar", description: "PV panels", icon: Sun },
  { value: "solar_water_heater", label: "Solar water heater", description: "Offsets the geyser", icon: SunMedium },
];

/** Fallback when the geo store has no areas for this ward (never expected in the demo). */
const FALLBACK_AREAS: ReadonlyArray<Pick<Area, "id" | "name">> = [
  { id: "area-xyz", name: "XYZ Colony" },
  { id: "area-abc", name: "ABC Colony" },
  { id: "area-def", name: "DEF Colony" },
  { id: "area-ghi", name: "GHI Colony" },
];

const TIPS = [
  { title: "People", text: "Sets the per-person band used for the Ward 24 peer comparison." },
  { title: "Home type", text: "Seeds cooling and lighting defaults until you add appliance details." },
  { title: "Area", text: "Picks the supply schedule and the peer group you are compared with." },
  { title: "Renewable", text: "Offsets grid units in your Green Score — never in your measured bill." },
] as const;

/** Step 2 — confirm the prefilled household basics. Writes `updateHousehold` + section status. */
export function HouseholdStep({ household, wardLabel, onSaved, onSkip }: HouseholdStepProps) {
  const updateHousehold = useDataStore((s) => s.updateHousehold);
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);
  const areas = useDataStore((s) => s.areas);

  const wardAreas = useMemo(() => {
    const own = areas.filter((a) => a.wardId === household.wardId);
    return own.length > 0 ? own : FALLBACK_AREAS;
  }, [areas, household.wardId]);

  const [people, setPeople] = useState<number>(Math.min(8, Math.max(1, household.people || 1)));
  const [homeType, setHomeType] = useState<HomeType>(household.homeType);
  const [areaId, setAreaId] = useState<string>(household.areaId);
  const [renewable, setRenewable] = useState<Renewable>(household.renewable);

  const handleSave = () => {
    const areaValid = wardAreas.some((a) => a.id === areaId);
    updateHousehold(household.id, {
      people,
      homeType,
      renewable,
      ...(areaValid && areaId !== household.areaId ? { areaId } : {}),
    });
    setSectionStatus(household.id, "household", "complete");
    toast.success("Household details saved.", {
      description: `${household.id} · ${people} ${people === 1 ? "person" : "people"} · ${homeType} · ${wardLabel}`,
    });
    onSaved();
  };

  return (
    <StepShell
      eyebrow="Step 2 · Household"
      icon={Home}
      title="Confirm your household"
      description="Prefilled from your registration — adjust anything that changed. These details calibrate your baseline and the Ward 24 peer comparison."
      headerAside={<EyebrowPill tone="neutral" dot={false}>Prefilled · just confirm</EyebrowPill>}
      aside={<AsideTips items={TIPS} />}
      footer={
        <>
          <SkipRow onSkip={onSkip} label="Keep the current details" />
          <Button type="button" onClick={handleSave} className="w-full sm:w-auto">
            Looks right — continue
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div>
        <FieldLabel
          hint="Everyone who lives here most days."
          trailing={`${people} ${people === 1 ? "resident" : "residents"}`}
        >
          Number of people
        </FieldLabel>
        <CountStepper label="Number of people" value={people} min={1} max={8} onChange={setPeople} />
      </div>

      <div>
        <FieldLabel hint="Choose the closest match.">Home type</FieldLabel>
        <ChoiceGrid<HomeChoice>
          label="Home type"
          columns={3}
          size="sm"
          options={HOME_OPTIONS}
          value={homeType === "other" ? null : homeType}
          onChange={(v) => setHomeType(v)}
        />
      </div>

      <div>
        <FieldLabel htmlFor="onboarding-area" hint="Your colony inside the ward.">
          Area
        </FieldLabel>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger id="onboarding-area" aria-label="Area" className="h-11 w-full sm:max-w-sm">
            <SelectValue placeholder="Choose your area" />
          </SelectTrigger>
          <SelectContent>
            {wardAreas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {wardLabel} · {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FieldLabel hint="Only if it is already installed.">Renewable energy</FieldLabel>
        <ChoiceGrid<Renewable>
          label="Renewable energy"
          columns={3}
          size="sm"
          options={RENEWABLE_OPTIONS}
          value={renewable}
          onChange={setRenewable}
        />
      </div>
    </StepShell>
  );
}
