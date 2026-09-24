import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  AppliancePicker,
  defaultsFor,
  toPayload,
  type Selection,
} from "@/components/onboarding/appliance-picker";
import type { ApplianceTypeInfo } from "@/lib/types";

const CATALOG: ApplianceTypeInfo[] = [
  {
    type: "ac_1.5ton",
    label: "AC 1.5 ton",
    has_star_rating: true,
    default_hours: 6,
    always_on: false,
    watts_by_star: { "1": 2200, "3": 1600, "5": 1200 },
    default_watts: 100,
  },
  {
    type: "refrigerator",
    label: "Refrigerator",
    has_star_rating: true,
    default_hours: 24,
    always_on: true,
    watts_by_star: { "1": 85, "3": 55, "5": 35 },
    default_watts: 100,
  },
  {
    type: "ceiling_fan",
    label: "Ceiling fan",
    has_star_rating: false,
    default_hours: 8,
    always_on: false,
    watts_by_star: {},
    default_watts: 75,
  },
];

function Harness({ initial = {} }: { initial?: Selection }) {
  const [selection, setSelection] = useState<Selection>(initial);
  return <AppliancePicker catalog={CATALOG} selection={selection} onChange={setSelection} />;
}

describe("defaultsFor", () => {
  it("starts a star-rated appliance at 3 stars and its catalog hours", () => {
    expect(defaultsFor(CATALOG[0]!)).toEqual({
      type: "ac_1.5ton",
      count: 1,
      daily_hours: 6,
      star_rating: 3,
    });
  });

  it("leaves the star rating null for types that have none", () => {
    expect(defaultsFor(CATALOG[2]!).star_rating).toBeNull();
  });
});

describe("toPayload", () => {
  it("returns the selected appliances in catalog order", () => {
    const selection: Selection = {
      ceiling_fan: defaultsFor(CATALOG[2]!),
      "ac_1.5ton": defaultsFor(CATALOG[0]!),
    };
    expect(toPayload(CATALOG, selection).map((a) => a.type)).toEqual(["ac_1.5ton", "ceiling_fan"]);
  });

  it("is empty when nothing is selected, which clears the profile", () => {
    expect(toPayload(CATALOG, {})).toEqual([]);
  });
});

describe("AppliancePicker", () => {
  it("adds an appliance when its chip is tapped and removes it when tapped again", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const chip = screen.getByRole("button", { name: "Ceiling fan" });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Hours a day")).toHaveValue(8);

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByLabelText("Hours a day")).not.toBeInTheDocument();
  });

  it("steps the count and stops at one", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ceiling_fan: defaultsFor(CATALOG[2]!) }} />);

    const count = screen.getByLabelText("How many");
    expect(count).toHaveValue("1");
    expect(screen.getByRole("button", { name: "One fewer Ceiling fan" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "One more Ceiling fan" }));
    expect(count).toHaveValue("2");

    await user.click(screen.getByRole("button", { name: "One fewer Ceiling fan" }));
    expect(count).toHaveValue("1");
  });

  it("hides the hours field for an always-on appliance", () => {
    render(<Harness initial={{ refrigerator: defaultsFor(CATALOG[1]!) }} />);
    expect(screen.queryByLabelText("Hours a day")).not.toBeInTheDocument();
    expect(screen.getByText("Runs all day, every day.")).toBeInTheDocument();
  });

  it("offers a star rating only where one exists", () => {
    const { unmount } = render(<Harness initial={{ ceiling_fan: defaultsFor(CATALOG[2]!) }} />);
    expect(screen.queryByLabelText("Star rating")).not.toBeInTheDocument();
    unmount();

    render(<Harness initial={{ "ac_1.5ton": defaultsFor(CATALOG[0]!) }} />);
    expect(screen.getByLabelText("Star rating")).toBeInTheDocument();
  });

  it("labels the estimate honestly — never as a measurement", () => {
    render(<Harness />);
    const note = screen.getByText(/BEE star-rating wattages/i);
    expect(note).toHaveTextContent(/estimates, not measurements/i);
    expect(document.body.textContent).not.toMatch(/NILM|disaggregat|AI-powered/i);
  });

  it("reports every change to its parent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppliancePicker catalog={CATALOG} selection={{}} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Ceiling fan" }));
    expect(onChange).toHaveBeenCalledWith({ ceiling_fan: defaultsFor(CATALOG[2]!) });
  });
});
