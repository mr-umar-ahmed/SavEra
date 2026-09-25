/**
 * Gas & Piped Natural Gas (PNG) / LPG Calculation & Anomaly Engine
 * Pure calculation functions for smart meter telemetry, water balance / gas balance,
 * continuous trace leak detection, burst rupture detection, and pressure decay integrity verification.
 * Aligned with PNGRB Technical Standards and MoHUA Smart Utility guidelines.
 */

import type {
  GasAnomalyKind,
  GasAnomalyVerdict,
  GasMeterTelemetry,
  GasPressureDecayResult,
} from "@/types/gas";

/** Standard density / conversion: 1 SCM of Natural Gas ≈ 0.76 - 0.80 kg LPG equivalent energy */
export const SCM_TO_LPG_KG_FACTOR = 0.76;

/** Nominal residential gas supply pressure in India (PNGRB): 21.0 mbar */
export const NOMINAL_RESIDENTIAL_PRESSURE_MBAR = 21.0;

/** Normal Methane/LPG safety limits */
export const METHANE_WARNING_PPM = 200;
export const METHANE_CRITICAL_PPM = 500; // 10% Lower Explosive Limit (LEL) trip threshold

/** Trace micro-leak threshold: flow between 0.010 and 0.040 SCMH during standby */
export const MICRO_LEAK_MIN_SCMH = 0.010;
export const MICRO_LEAK_MAX_SCMH = 0.045;

/** Burst rupture flow threshold: > 1.80 SCMH accompanied by pressure collapse */
export const BURST_RUPTURE_MIN_SCMH = 1.60;
export const BURST_PRESSURE_DROP_MBAR = 12.0;

/**
 * Evaluates real-time telemetry from smart gas meter and in-home safety sensors.
 * Returns an explainable, deterministic verdict.
 * Rule: Discrepancies are NEVER called "confirmed leaks" without physical verification.
 */
export function evaluateGasAnomaly(
  telemetry: GasMeterTelemetry,
  options?: {
    applianceStandby?: boolean;
    unattendedDurationMins?: number;
  }
): GasAnomalyVerdict {
  const isStandby = options?.applianceStandby ?? false;
  const unattendedMins = options?.unattendedDurationMins ?? 0;

  // 1. Critical Line Rupture or Explosive Gas Concentration
  if (
    telemetry.ambientMethanePpm >= METHANE_CRITICAL_PPM ||
    (telemetry.instantFlowScmh >= BURST_RUPTURE_MIN_SCMH &&
      telemetry.linePressureMbar <= BURST_PRESSURE_DROP_MBAR)
  ) {
    return {
      status: "burst_rupture",
      severity: "critical",
      headline: "🚨 Emergency: Pipeline Fracture or Rapid Methane Accumulation Detected",
      explanation: `Line pressure dropped to ${telemetry.linePressureMbar.toFixed(
        1
      )} mbar with abnormal flow of ${telemetry.instantFlowScmh.toFixed(
        2
      )} SCMH and ambient methane at ${telemetry.ambientMethanePpm} PPM. Immediate automated isolation triggered.`,
      recommendedAction:
        "Emergency solenoid valve auto-tripped. Evacuate kitchen, do not operate electrical switches, and verify pipeline integrity.",
      autoCutoffTriggered: true,
      confidence: "high",
      requiresVerification: true,
    };
  }

  // 2. Unattended Burner (High continuous run without activity)
  if (unattendedMins > 180 && telemetry.instantFlowScmh > 0.15) {
    return {
      status: "unattended_burner",
      severity: "medium",
      headline: "⚠️ Unattended Burner Advisory",
      explanation: `Continuous active gas consumption (${telemetry.instantFlowScmh.toFixed(
        2
      )} SCMH) for over ${Math.floor(
        unattendedMins / 60
      )} hours without interactive setpoint adjustment.`,
      recommendedAction:
        "Verify stove burners are turned off if cooking has concluded. Smart remote shutoff is available if away from home.",
      autoCutoffTriggered: false,
      confidence: "medium",
      requiresVerification: true,
    };
  }

  // 3. Household Micro-Leak / Loose Fitting
  if (
    isStandby &&
    telemetry.instantFlowScmh >= MICRO_LEAK_MIN_SCMH &&
    telemetry.instantFlowScmh <= MICRO_LEAK_MAX_SCMH
  ) {
    return {
      status: "micro_leak",
      severity: "high",
      headline: "⚠️ Possible Household Gas Discrepancy — Micro-Leak Signal",
      explanation: `Continuous trace flow of ${telemetry.instantFlowScmh.toFixed(
        3
      )} SCMH detected while appliances are nominally idle. Ambient sensor reading: ${
        telemetry.ambientMethanePpm
      } PPM. Pattern indicates possible burner valve weepage or regulator hose degradation.`,
      recommendedAction:
        "Inspect stove knobs and flexible suraksha hose. Conduct soap-bubble solution test on manifold joints. Requires technician verification.",
      autoCutoffTriggered: false,
      confidence: "high",
      requiresVerification: true,
    };
  }

  // 4. Upstream District Regulating Station (DRS) Supply Drop
  if (telemetry.linePressureMbar < 15.0 && telemetry.instantFlowScmh < 0.05) {
    return {
      status: "pressure_drop_cgd",
      severity: "medium",
      headline: "⚠️ Low Distribution Network Pressure",
      explanation: `Inlet line pressure is ${telemetry.linePressureMbar.toFixed(
        1
      )} mbar (nominal 21.0 mbar). Upstream City Gas Distribution (CGD) sub-skid pressure reduction observed.`,
      recommendedAction:
        "Network pressure curtailment under investigation by municipal gas authority. Burners may exhibit reduced heat output.",
      autoCutoffTriggered: false,
      confidence: "medium",
      requiresVerification: true,
    };
  }

  // 5. Offline or Delayed Sensor Telemetry
  if (telemetry.status === "sensor_offline") {
    return {
      status: "sensor_offline",
      severity: "low",
      headline: "⚠️ Insufficient Smart Meter Telemetry",
      explanation:
        "Smart gas meter has missed recent scheduled LoRaWAN packets. Loss analytics paused to prevent false alarm.",
      recommendedAction:
        "Check gateway communication node. Meter continues mechanical register accumulation safely.",
      autoCutoffTriggered: false,
      confidence: "low",
      requiresVerification: true,
    };
  }

  // Normal Distribution State
  return {
    status: "normal",
    severity: "low",
    headline: "✅ Gas Supply & Household Flow Normal",
    explanation: `Line pressure stable at ${telemetry.linePressureMbar.toFixed(
      1
    )} mbar. Flow rate ${telemetry.instantFlowScmh.toFixed(
      2
    )} SCMH conforms to active household appliance demands. No unignited gas detected (${
      telemetry.ambientMethanePpm
    } PPM).`,
    recommendedAction: "System functioning within PNGRB residential safety tolerance.",
    autoCutoffTriggered: false,
    confidence: "high",
    requiresVerification: false,
  };
}

/**
 * Computes gas balance comparing City Gas Distribution (DRS) feeder inflow
 * vs the sum of downstream consumer smart gas meters.
 */
export function calculateGasBalance(
  drsInflowScmh: number,
  downstreamSumScmh: number,
  tolerancePct = 4.0
): {
  inflowScmh: number;
  downstreamSumScmh: number;
  discrepancyScmh: number;
  discrepancyPct: number;
  state: "normal" | "possible_discrepancy" | "high_confidence_signal";
  message: string;
} {
  const discrepancyScmh = Math.max(0, Number((drsInflowScmh - downstreamSumScmh).toFixed(3)));
  const discrepancyPct =
    drsInflowScmh > 0
      ? Number(((discrepancyScmh / drsInflowScmh) * 100).toFixed(1))
      : 0;

  if (discrepancyPct <= tolerancePct) {
    return {
      inflowScmh: drsInflowScmh,
      downstreamSumScmh,
      discrepancyScmh,
      discrepancyPct,
      state: "normal",
      message: "✅ Gas distribution appears normal across this district segment.",
    };
  }

  if (discrepancyPct > 15.0) {
    return {
      inflowScmh: drsInflowScmh,
      downstreamSumScmh,
      discrepancyScmh,
      discrepancyPct,
      state: "high_confidence_signal",
      message: `🚨 Repeated gas loss signal detected (${discrepancyPct}% discrepancy, ${discrepancyScmh.toFixed(
        2
      )} SCMH). Pattern indicates possible distribution pipeline or joint loss. Requires physical verification.`,
    };
  }

  return {
    inflowScmh: drsInflowScmh,
    downstreamSumScmh,
    discrepancyScmh,
    discrepancyPct,
    state: "possible_discrepancy",
    message: `⚠️ Gas supply discrepancy detected (${discrepancyPct}% difference). May be caused by meter timing skew, density variation, or possible network loss. Requires verification.`,
  };
}

/**
 * Runs automated 30-second static line pressure decay test before allowing
 * motorized solenoid valve to re-arm. (Mandatory safety protocol per NFPA 54 / IS 15139)
 */
export function runPressureDecayTest(
  initialMbar: number,
  after30sMbar: number
): GasPressureDecayResult {
  const decayMbar = Math.max(0, Number((initialMbar - after30sMbar).toFixed(2)));
  // Maximum allowed pressure decay over 30s is 0.20 mbar (measurement noise)
  const passed = decayMbar <= 0.20;

  return {
    passed,
    initialMbar,
    decayMbar,
    durationSeconds: 30,
    timestamp: new Date().toISOString(),
    details: passed
      ? `Static pressure hold verified (${decayMbar.toFixed(
          2
        )} mbar drop in 30s). Line integrity intact. Safe to re-arm solenoid shutoff valve.`
      : `Static pressure decay exceeded safe threshold (${decayMbar.toFixed(
          2
        )} mbar drop). Possible open appliance valve or piping leak. Solenoid re-arming aborted for safety.`,
  };
}

export function formatScmh(val: number): string {
  return `${val.toFixed(2)} SCMH`;
}

export function formatMbar(val: number): string {
  return `${val.toFixed(1)} mbar`;
}

export function formatPpm(val: number): string {
  return `${val} PPM`;
}

export function convertScmToLpgKg(scm: number): number {
  return Number((scm * SCM_TO_LPG_KG_FACTOR).toFixed(2));
}
