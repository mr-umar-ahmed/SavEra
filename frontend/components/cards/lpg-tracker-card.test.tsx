/**
 * Component tests for LpgTrackerCard.
 *
 * Phase 3 acceptance: "LPG tracker shows correct finish date matching API
 * output" and "Vitest: component unit tests for LPGTrackerCard."
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LpgTrackerCard } from "@/components/cards/lpg-tracker-card";
import type { LpgSummary } from "@/lib/types";

const makePrediction = (overrides = {}) => ({
  estimated_finish_date: "2026-10-15",
  refill_alert_date: "2026-10-12",
  kg_remaining: 5.5,
  burn_rate_kg_per_day: 0.568,
  days_to_empty: 10,
  should_alert_now: false,
  pct_remaining: 38.7,
  days_elapsed: 16,
  ...overrides,
});

describe("LpgTrackerCard", () => {
  it("shows 'No cylinder being tracked' when cycle is null", () => {
    const summary: LpgSummary = { cycle: null, prediction: null };
    render(<LpgTrackerCard summary={summary} />);
    expect(screen.getByText("No cylinder being tracked")).toBeInTheDocument();
  });

  it("shows the percentage remaining when a cycle is active", () => {
    const summary: LpgSummary = {
      cycle: { id: "abc", cylinder_kg: 14.2, start_date: "2026-09-29", days: 16, is_open: true },
      prediction: makePrediction(),
    };
    render(<LpgTrackerCard summary={summary} />);
    expect(screen.getByTestId("lpg-pct")).toBeInTheDocument();
  });

  it("shows 'On track' when not near empty", () => {
    const summary: LpgSummary = {
      cycle: { id: "abc", cylinder_kg: 14.2, start_date: "2026-09-29", days: 10, is_open: true },
      prediction: makePrediction({ should_alert_now: false, kg_remaining: 8 }),
    };
    render(<LpgTrackerCard summary={summary} />);
    expect(screen.getByText("On track")).toBeInTheDocument();
  });

  it("shows 'Book a refill' when should_alert_now is true", () => {
    const summary: LpgSummary = {
      cycle: { id: "abc", cylinder_kg: 14.2, start_date: "2026-09-10", days: 22, is_open: true },
      prediction: makePrediction({ should_alert_now: true, kg_remaining: 1.2 }),
    };
    render(<LpgTrackerCard summary={summary} />);
    expect(screen.getByText("Book a refill")).toBeInTheDocument();
  });

  it("shows 'Past empty' when kg_remaining is 0", () => {
    const summary: LpgSummary = {
      cycle: { id: "abc", cylinder_kg: 14.2, start_date: "2026-08-15", days: 40, is_open: true },
      prediction: makePrediction({ kg_remaining: 0, pct_remaining: 0 }),
    };
    render(<LpgTrackerCard summary={summary} />);
    expect(screen.getByText("Past empty")).toBeInTheDocument();
  });

  it("displays the estimated finish date from the API prediction", () => {
    const summary: LpgSummary = {
      cycle: { id: "abc", cylinder_kg: 14.2, start_date: "2026-09-29", days: 16, is_open: true },
      prediction: makePrediction({ estimated_finish_date: "2026-10-15" }),
    };
    render(<LpgTrackerCard summary={summary} />);
    // The finish date is rendered in the data-testid="lpg-finish-date" element
    const finishDateEl = screen.getByTestId("lpg-finish-date");
    expect(finishDateEl).toHaveTextContent("15 Oct");
    expect(screen.getAllByText(/15 Oct/).length).toBeGreaterThan(0);
  });

  it("wraps in a link when href is provided", () => {
    const summary: LpgSummary = { cycle: null, prediction: null };
    const { container } = render(<LpgTrackerCard summary={summary} href="/lpg" />);
    const link = container.querySelector("a[href='/lpg']");
    expect(link).toBeInTheDocument();
  });
});
