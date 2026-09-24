/**
 * Component tests for GreenScoreGauge.
 *
 * Phase 3 acceptance: "Vitest: component unit tests for GreenScoreGauge."
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GreenScoreGauge, bandFor } from "@/components/charts/green-score-gauge";

describe("bandFor", () => {
  it("returns 'good' for scores >= 70", () => {
    expect(bandFor(70)).toBe("good");
    expect(bandFor(100)).toBe("good");
    expect(bandFor(85)).toBe("good");
  });

  it("returns 'warn' for scores 40–69", () => {
    expect(bandFor(40)).toBe("warn");
    expect(bandFor(69)).toBe("warn");
    expect(bandFor(55)).toBe("warn");
  });

  it("returns 'bad' for scores < 40", () => {
    expect(bandFor(0)).toBe("bad");
    expect(bandFor(39)).toBe("bad");
    expect(bandFor(10)).toBe("bad");
  });
});

describe("GreenScoreGauge", () => {
  it("renders the score value", () => {
    render(<GreenScoreGauge score={72} animate={false} />);
    expect(screen.getByTestId("gauge-value")).toHaveTextContent("72");
  });

  it("renders 'out of 100' for a valid score", () => {
    render(<GreenScoreGauge score={50} animate={false} />);
    expect(screen.getByText("out of 100")).toBeInTheDocument();
  });

  it("renders '—' for null score", () => {
    render(<GreenScoreGauge score={null} animate={false} />);
    expect(screen.getByTestId("gauge-value")).toHaveTextContent("—");
    expect(screen.getByText("not scored yet")).toBeInTheDocument();
  });

  it("clamps score to 0–100", () => {
    render(<GreenScoreGauge score={150} animate={false} />);
    expect(screen.getByTestId("gauge-value")).toHaveTextContent("100");
  });

  it("renders a meter element with correct aria attributes", () => {
    render(<GreenScoreGauge score={85} animate={false} label="Test Score" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuenow", "85");
    expect(meter).toHaveAttribute("aria-label", "Test Score");
  });

  it("renders the label text", () => {
    render(<GreenScoreGauge score={60} animate={false} label="My Score" />);
    expect(screen.getByText("My Score")).toBeInTheDocument();
  });
});
