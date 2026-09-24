/**
 * Setup completeness — a score, never a gate (MASTER_PROMPT §2.3, §6.2).
 *
 * Weights (sum 100): household details 15 · appliance details 30 (× detail score) ·
 * electricity bills 20 (full at 6+ bills) · water setup 10 · LPG setup 10 · carbon inputs 10.
 * H-1024: 15 + 30 × 0.77 + 20 + 10 + 10 + 0 ≈ 78 %.
 */

import { getCatalogueEntry } from "@/data/catalogue/appliances";
import { SETUP_SECTION_LABEL } from "@/types";
import type {
  Appliance,
  CompletenessKey,
  CompletenessReport,
  CompletenessSection,
  ElectricityBill,
  Household,
  SetupStatus,
} from "@/types";
import { applianceDetailScore } from "./appliances";
import { uniqueBillsByMonth } from "./baseline";

export const COMPLETENESS_WEIGHTS: Record<CompletenessKey, number> = {
  household: 0.15,
  appliances: 0.3,
  bills: 0.2,
  water: 0.1,
  gas: 0.1,
  carbon: 0.1,
  electricity: 0,
};

/** Bills at which the bills section counts as complete (seasonal baselines unlock). */
export const BILLS_FOR_FULL_CREDIT = 6;

export const COMPLETENESS_FOOTER = "Complete your profile to improve appliance-level estimates.";

const SECTION_HREF: Record<CompletenessKey, string> = {
  household: "/citizen/setup/household",
  appliances: "/citizen/setup/electricity",
  electricity: "/citizen/setup/electricity",
  bills: "/citizen/setup/electricity",
  water: "/citizen/setup/water",
  gas: "/citizen/setup/gas",
  carbon: "/citizen/carbon",
};

export interface CompletenessInput {
  household: Household;
  appliances: Appliance[];
  bills: ElectricityBill[];
  hasWaterSetup: boolean;
  hasLpgSetup: boolean;
  hasCarbon: boolean;
}

function statusCredit(status: SetupStatus): number {
  return status === "complete" ? 1 : status === "partial" ? 0.5 : 0;
}

function sectionStatus(has: boolean, declared: SetupStatus): SetupStatus {
  if (has) return "complete";
  return declared === "partial" || declared === "later" ? declared : "none";
}

function applianceLabel(a: Appliance): string {
  return (a.label || getCatalogueEntry(a.type).label).toLowerCase();
}

export function computeCompleteness(i: CompletenessInput): CompletenessReport {
  const sections: CompletenessSection[] = [];
  let percent = 0;

  // Household details
  const householdStatus = i.household.sections.household;
  sections.push({
    key: "household",
    label: SETUP_SECTION_LABEL.household,
    status: householdStatus,
    hint: "Household size and home type sharpen the area comparison and the default baseline.",
    weight: COMPLETENESS_WEIGHTS.household,
  });
  percent += COMPLETENESS_WEIGHTS.household * statusCredit(householdStatus);

  // Appliance details
  const detail = applianceDetailScore(i.appliances);
  const incomplete = i.appliances.filter((a) => a.setupStatus !== "complete");
  const appliancesStatus: SetupStatus =
    i.appliances.length === 0
      ? "none"
      : incomplete.length === 0
        ? "complete"
        : incomplete.every((a) => a.setupStatus === "later")
          ? "later"
          : "partial";
  const missingLabels = incomplete.map(applianceLabel);
  sections.push({
    key: "appliances",
    label: "Appliance details",
    status: appliancesStatus,
    hint:
      i.appliances.length === 0
        ? "Add your appliances to unlock appliance-level estimates."
        : incomplete.length === 0
          ? `All ${i.appliances.length} appliances complete (${Math.round(detail * 100)} % detail).`
          : `Complete ${missingLabels.join(" and ")} details to sharpen appliance-level estimates (${Math.round(
              detail * 100,
            )} % detail).`,
    weight: COMPLETENESS_WEIGHTS.appliances,
  });
  percent += COMPLETENESS_WEIGHTS.appliances * detail;

  // Bills
  const billCount = uniqueBillsByMonth(i.bills).length;
  const billsStatus: SetupStatus =
    billCount === 0 ? "none" : billCount >= BILLS_FOR_FULL_CREDIT ? "complete" : "partial";
  sections.push({
    key: "bills",
    label: "Electricity bills",
    status: billsStatus,
    hint:
      billCount >= BILLS_FOR_FULL_CREDIT
        ? `${billCount} months of bills — seasonal baselines available.`
        : `${billCount} of ${BILLS_FOR_FULL_CREDIT} bills — ${BILLS_FOR_FULL_CREDIT}+ unlock seasonal baselines and higher confidence.`,
    weight: COMPLETENESS_WEIGHTS.bills,
  });
  percent += COMPLETENESS_WEIGHTS.bills * Math.min(1, billCount / BILLS_FOR_FULL_CREDIT);

  // Water / gas / carbon
  const water = sectionStatus(i.hasWaterSetup, i.household.sections.water);
  sections.push({
    key: "water",
    label: "Water setup",
    status: water,
    hint: "Map usage points to receive supply updates and a water efficiency score.",
    weight: COMPLETENESS_WEIGHTS.water,
  });
  percent += COMPLETENESS_WEIGHTS.water * statusCredit(water);

  const gas = sectionStatus(i.hasLpgSetup, i.household.sections.gas);
  sections.push({
    key: "gas",
    label: "LPG setup",
    status: gas,
    hint: "Track cylinders to get refill predictions and consumption alerts.",
    weight: COMPLETENESS_WEIGHTS.gas,
  });
  percent += COMPLETENESS_WEIGHTS.gas * statusCredit(gas);

  const carbon = sectionStatus(i.hasCarbon, i.household.sections.carbon);
  sections.push({
    key: "carbon",
    label: "Carbon inputs",
    status: carbon,
    hint: "Add commute, diet and lifestyle to complete your carbon footprint.",
    weight: COMPLETENESS_WEIGHTS.carbon,
  });
  percent += COMPLETENESS_WEIGHTS.carbon * statusCredit(carbon);

  // Next action: the first incomplete section in priority order.
  let nextAction: CompletenessReport["nextAction"];
  const firstIncompleteAppliance = incomplete[0];
  if (householdStatus !== "complete") {
    nextAction = { label: "Add household details", href: SECTION_HREF.household };
  } else if (i.appliances.length === 0) {
    nextAction = { label: "Add your appliances", href: SECTION_HREF.appliances };
  } else if (firstIncompleteAppliance) {
    nextAction = {
      label: `Add ${applianceLabel(firstIncompleteAppliance)} details`,
      href: SECTION_HREF.appliances,
    };
  } else if (billsStatus !== "complete") {
    nextAction = { label: billCount === 0 ? "Add your current bill" : "Upload previous bills", href: SECTION_HREF.bills };
  } else if (water !== "complete") {
    nextAction = { label: "Set up water", href: SECTION_HREF.water };
  } else if (gas !== "complete") {
    nextAction = { label: "Set up LPG", href: SECTION_HREF.gas };
  } else if (carbon !== "complete") {
    nextAction = { label: "Add carbon inputs", href: SECTION_HREF.carbon };
  }

  return { percent: Math.round(percent * 100), sections, nextAction };
}
