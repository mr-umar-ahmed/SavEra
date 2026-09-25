import { describe, expect, it } from "vitest";
import {
  calculateGasBalance,
  convertScmToLpgKg,
  evaluateGasAnomaly,
  formatMbar,
  formatPpm,
  formatScmh,
  runPressureDecayTest,
} from "./gas";
import type { GasMeterTelemetry } from "@/types/gas";

const MOCK_NORMAL_TELEMETRY: GasMeterTelemetry = {
  meterId: "GM-ITRON-ULTRASONIC-4410",
  householdId: "h-1024",
  instantFlowScmh: 0.28,
  instantFlowKgH: 0.21,
  cumulativeVolumeScm: 142.85,
  linePressureMbar: 21.0,
  gasTemperatureC: 24.2,
  ambientMethanePpm: 18,
  valveState: "open",
  batteryPct: 96,
  rssiDbm: -82,
  status: "normal",
  lastHeartbeat: "Just now",
};

describe("Gas Calculation & Anomaly Engine", () => {
  it("evaluates normal operational gas telemetry correctly", () => {
    const verdict = evaluateGasAnomaly(MOCK_NORMAL_TELEMETRY);
    expect(verdict.status).toBe("normal");
    expect(verdict.autoCutoffTriggered).toBe(false);
    expect(verdict.requiresVerification).toBe(false);
  });

  it("detects micro-leak when appliances are nominally on standby", () => {
    const microLeakTelemetry: GasMeterTelemetry = {
      ...MOCK_NORMAL_TELEMETRY,
      instantFlowScmh: 0.022,
      ambientMethanePpm: 240,
      status: "micro_leak",
    };

    const verdict = evaluateGasAnomaly(microLeakTelemetry, {
      applianceStandby: true,
    });
    expect(verdict.status).toBe("micro_leak");
    expect(verdict.severity).toBe("high");
    expect(verdict.requiresVerification).toBe(true);
    expect(verdict.autoCutoffTriggered).toBe(false);
  });

  it("triggers automated cutoff on critical line rupture or explosive PPM", () => {
    const ruptureTelemetry: GasMeterTelemetry = {
      ...MOCK_NORMAL_TELEMETRY,
      instantFlowScmh: 1.95,
      linePressureMbar: 8.4,
      ambientMethanePpm: 680,
      status: "burst_rupture",
    };

    const verdict = evaluateGasAnomaly(ruptureTelemetry);
    expect(verdict.status).toBe("burst_rupture");
    expect(verdict.severity).toBe("critical");
    expect(verdict.autoCutoffTriggered).toBe(true);
    expect(verdict.requiresVerification).toBe(true);
  });

  it("identifies unattended burner running for over 3 hours", () => {
    const verdict = evaluateGasAnomaly(MOCK_NORMAL_TELEMETRY, {
      unattendedDurationMins: 210,
    });
    expect(verdict.status).toBe("unattended_burner");
    expect(verdict.severity).toBe("medium");
  });

  it("computes gas balance across DRS feeder and downstream meters", () => {
    // Normal case (within tolerance)
    const normalBalance = calculateGasBalance(10.0, 9.8, 4.0);
    expect(normalBalance.state).toBe("normal");
    expect(normalBalance.discrepancyPct).toBe(2.0);

    // Possible discrepancy case
    const discrepancyBalance = calculateGasBalance(10.0, 9.1, 4.0);
    expect(discrepancyBalance.state).toBe("possible_discrepancy");
    expect(discrepancyBalance.discrepancyPct).toBe(9.0);

    // Repeated loss signal case
    const highLossBalance = calculateGasBalance(10.0, 7.5, 4.0);
    expect(highLossBalance.state).toBe("high_confidence_signal");
    expect(highLossBalance.discrepancyPct).toBe(25.0);
  });

  it("executes static pressure decay test for safe valve re-arming", () => {
    // Passed test (stable pressure)
    const passResult = runPressureDecayTest(21.0, 20.95);
    expect(passResult.passed).toBe(true);
    expect(passResult.decayMbar).toBe(0.05);

    // Failed test (pressure decay > 0.20 mbar indicates leak)
    const failResult = runPressureDecayTest(21.0, 18.6);
    expect(failResult.passed).toBe(false);
    expect(failResult.decayMbar).toBe(2.4);
  });

  it("formats gas units accurately", () => {
    expect(formatScmh(0.284)).toBe("0.28 SCMH");
    expect(formatMbar(21.04)).toBe("21.0 mbar");
    expect(formatPpm(45)).toBe("45 PPM");
    expect(convertScmToLpgKg(10)).toBe(7.6);
  });
});
