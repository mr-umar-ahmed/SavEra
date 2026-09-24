/**
 * Component tests for ConsumptionBarChart.
 *
 * Phase 3 acceptance: "All charts render correctly with 1 reading, 3 readings,
 * and 6 readings (edge cases)."
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsumptionBarChart } from "@/components/charts/consumption-bar-chart";

describe("ConsumptionBarChart", () => {
  it("shows an empty-state message for zero data points", () => {
    render(<ConsumptionBarChart data={[]} unit="kWh/30d" />);
    expect(screen.getByText(/no readings yet/i)).toBeInTheDocument();
  });

  it("renders a chart container for 1 data point", () => {
    render(
      <ConsumptionBarChart
        data={[{ label: "Aug", value: 300 }]}
        unit="kWh/30d"
      />,
    );
    expect(screen.getByTestId("consumption-chart")).toBeInTheDocument();
  });

  it("renders a chart container for 3 data points", () => {
    render(
      <ConsumptionBarChart
        data={[
          { label: "Jun", value: 280 },
          { label: "Jul", value: 310 },
          { label: "Aug", value: 295 },
        ]}
        unit="kWh/30d"
        baseline={300}
      />,
    );
    expect(screen.getByTestId("consumption-chart")).toBeInTheDocument();
  });

  it("renders a chart container for 6 data points with baseline", () => {
    const data = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
      (label, i) => ({ label, value: 280 + i * 10 }),
    );
    render(
      <ConsumptionBarChart
        data={data}
        unit="kWh/30d"
        baseline={300}
        upperThreshold={350}
      />,
    );
    expect(screen.getByTestId("consumption-chart")).toBeInTheDocument();
  });

  it("applies the correct height", () => {
    const { container } = render(
      <ConsumptionBarChart
        data={[{ label: "Sep", value: 400 }]}
        unit="kWh/30d"
        height={300}
      />,
    );
    const el = container.querySelector("[data-testid='consumption-chart']");
    expect(el).toHaveStyle({ height: "300px" });
  });
});
