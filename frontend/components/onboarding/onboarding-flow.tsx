"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AppliancePicker,
  defaultsFor,
  toPayload,
  type Selection,
} from "@/components/onboarding/appliance-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { putAppliances, updateProfile } from "@/lib/endpoints";
import type { Appliance, ApplianceTypeInfo, Profile, Ward } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Suggested when someone skips straight past the picker — the near-universal set. */
const STARTER_TYPES = ["refrigerator", "ceiling_fan"] as const;

export interface OnboardingFlowProps {
  profile: Profile;
  wards: Ward[];
  catalog: ApplianceTypeInfo[];
  appliances: Appliance[];
}

/** Existing appliances, keyed by type, so re-running onboarding starts where you left off. */
export function selectionFrom(appliances: Appliance[]): Selection {
  return Object.fromEntries(
    appliances.map((appliance) => [
      appliance.type,
      {
        type: appliance.type,
        count: appliance.count,
        daily_hours: appliance.daily_hours,
        star_rating: appliance.star_rating ?? null,
      },
    ]),
  );
}

/**
 * Two screens, as the brief allows and no more: where you live, then what you
 * run. The first is the only one that gates the app — picking a ward is what
 * makes `onboarding_complete` true — so the second can be skipped and finished
 * later from the profile page.
 */
export function OnboardingFlow({ profile, wards, catalog, appliances }: OnboardingFlowProps) {
  const router = useRouter();
  const call = useApi();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(profile.name ?? "");
  const [wardId, setWardId] = useState<string>(profile.ward_id ? String(profile.ward_id) : "");
  const [householdSize, setHouseholdSize] = useState(String(profile.household_size ?? 1));
  const [selection, setSelection] = useState<Selection>(() =>
    appliances.length
      ? selectionFrom(appliances)
      : Object.fromEntries(
          catalog
            .filter((info) => (STARTER_TYPES as readonly string[]).includes(info.type))
            .map((info) => [info.type, defaultsFor(info)]),
        ),
  );

  const size = Number(householdSize);
  const step1Valid = Boolean(wardId) && Number.isFinite(size) && size >= 1 && size <= 20;

  async function saveHousehold() {
    setSaving(true);
    try {
      await call((ctx) =>
        updateProfile(
          { name: name.trim() || null, ward_id: Number(wardId), household_size: size },
          ctx,
        ),
      );
      setStep(2);
    } catch (err) {
      toast.error(describeError(err, "Could not save your details."));
    } finally {
      setSaving(false);
    }
  }

  async function finish(skip = false) {
    setSaving(true);
    try {
      if (!skip) {
        await call((ctx) => putAppliances(toPayload(catalog, selection), ctx));
      }
      toast.success("You're all set");
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not save your appliances."));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2" aria-label="Setup progress">
        {[1, 2].map((n) => (
          <li
            key={n}
            aria-current={step === n ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step >= n ? "bg-primary" : "bg-border",
            )}
          >
            <span className="sr-only">
              Step {n} of 2{step === n ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">Where is home?</h1>
            <p className="text-sm text-muted-foreground">
              Your ward is what lets us compare you with similar households nearby — always as an
              average, never household by household.
            </p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Your name</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ananya Rao"
                autoComplete="name"
                className="touch-target"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ward">Ward</FieldLabel>
              <Select value={wardId} onValueChange={setWardId}>
                <SelectTrigger id="ward" className="w-full touch-target">
                  <SelectValue placeholder="Pick your ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={String(ward.id)}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{profile.city} wards.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="household_size">People in the house</FieldLabel>
              <Input
                id="household_size"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={householdSize}
                onChange={(event) => setHouseholdSize(event.target.value)}
                className="w-28 touch-target tabular-nums"
              />
              <FieldDescription>
                Used to compare fairly — four people will always use more than one.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <Button
            size="lg"
            className="w-full touch-target"
            disabled={!step1Valid || saving}
            onClick={saveHousehold}
          >
            {saving ? <Spinner /> : null}
            Continue
            <ArrowRight aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">What do you run?</h1>
            <p className="text-sm text-muted-foreground">
              Pick what your home uses. This is what turns one number on a bill into a breakdown
              you can act on.
            </p>
          </div>

          <AppliancePicker catalog={catalog} selection={selection} onChange={setSelection} />

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full touch-target"
              disabled={saving}
              onClick={() => finish(false)}
            >
              {saving ? <Spinner /> : null}
              Finish setup
            </Button>
            <div className="flex items-center justify-between">
              <Button variant="ghost" className="touch-target" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden />
                Back
              </Button>
              <Button
                variant="ghost"
                className="touch-target text-muted-foreground"
                disabled={saving}
                onClick={() => finish(true)}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
