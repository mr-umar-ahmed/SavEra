"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AppliancePicker,
  toPayload,
  type Selection,
} from "@/components/onboarding/appliance-picker";
import { selectionFrom } from "@/components/onboarding/onboarding-flow";
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

export interface ProfileEditorProps {
  profile: Profile;
  wards: Ward[];
  catalog: ApplianceTypeInfo[];
  appliances: Appliance[];
}

/**
 * The same two things onboarding collects, editable afterwards: the household
 * and the appliance list. They save separately, so correcting a ward never
 * risks the appliance profile and vice versa.
 */
export function ProfileEditor({ profile, wards, catalog, appliances }: ProfileEditorProps) {
  const router = useRouter();
  const call = useApi();

  const [name, setName] = useState(profile.name ?? "");
  const [wardId, setWardId] = useState(profile.ward_id ? String(profile.ward_id) : "");
  const [householdSize, setHouseholdSize] = useState(String(profile.household_size));
  const [savingHousehold, setSavingHousehold] = useState(false);

  const [selection, setSelection] = useState<Selection>(() => selectionFrom(appliances));
  const [savingAppliances, setSavingAppliances] = useState(false);

  const size = Number(householdSize);
  const householdValid = Boolean(wardId) && Number.isFinite(size) && size >= 1 && size <= 20;

  async function saveHousehold() {
    setSavingHousehold(true);
    try {
      await call((ctx) =>
        updateProfile(
          { name: name.trim() || null, ward_id: Number(wardId), household_size: size },
          ctx,
        ),
      );
      toast.success("Household saved");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not save your details."));
    } finally {
      setSavingHousehold(false);
    }
  }

  async function saveAppliances() {
    setSavingAppliances(true);
    try {
      await call((ctx) => putAppliances(toPayload(catalog, selection), ctx));
      toast.success("Appliances saved");
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not save your appliances."));
    } finally {
      setSavingAppliances(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">Your household</h2>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile.email}</span>
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-name">Name</FieldLabel>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="touch-target"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-ward">Ward</FieldLabel>
            <Select value={wardId} onValueChange={setWardId}>
              <SelectTrigger id="profile-ward" className="w-full touch-target">
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
            <FieldLabel htmlFor="profile-size">People in the house</FieldLabel>
            <Input
              id="profile-size"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={householdSize}
              onChange={(event) => setHouseholdSize(event.target.value)}
              className="w-28 touch-target tabular-nums"
            />
          </Field>
        </FieldGroup>

        <Button
          size="lg"
          className="touch-target"
          disabled={!householdValid || savingHousehold}
          onClick={saveHousehold}
        >
          {savingHousehold ? <Spinner /> : null}
          Save household
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">Your appliances</h2>
          <p className="text-sm text-muted-foreground">
            Keeping this current is what keeps the breakdown of your bill honest.
          </p>
        </div>

        <AppliancePicker catalog={catalog} selection={selection} onChange={setSelection} />

        <Button
          size="lg"
          className="touch-target"
          disabled={savingAppliances}
          onClick={saveAppliances}
        >
          {savingAppliances ? <Spinner /> : null}
          Save appliances
        </Button>
      </section>
    </div>
  );
}
