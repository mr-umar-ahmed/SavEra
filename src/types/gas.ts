/**
 * Gas & Piped Natural Gas (PNG) / LPG Smart Metering & Distribution Network Types
 * Aligned with PNGRB (Petroleum and Natural Gas Regulatory Board) standards,
 * smart ultrasonic/diaphragm gas meters, and IoT telemetry architectures.
 */

export type GasMeterValveState = "open" | "throttled" | "closed_manual" | "closed_auto";

export type GasAnomalyKind =
  | "normal"
  | "micro_leak"
  | "burst_rupture"
  | "unattended_burner"
  | "tamper_magnetic"
  | "pressure_drop_cgd"
  | "sensor_offline";

export interface GasMeterTelemetry {
  meterId: string;
  householdId: string;
  instantFlowScmh: number; // Standard Cubic Meters per Hour (SCMH)
  instantFlowKgH: number; // For LPG conversion (~0.76 kg/SCM)
  cumulativeVolumeScm: number;
  linePressureMbar: number; // Nominal residential 21.0 mbar (safe band: 18.0 - 24.0 mbar)
  gasTemperatureC: number;
  ambientMethanePpm: number; // Gas sniffer sensor (normal < 50 ppm, warning > 200 ppm, trip > 500 ppm)
  valveState: GasMeterValveState;
  batteryPct: number;
  rssiDbm: number;
  status: GasAnomalyKind;
  lastHeartbeat: string;
}

export type GasComponentCategory =
  | "drs_station"
  | "main_pipe"
  | "service_riser"
  | "solenoid_valve"
  | "smart_meter"
  | "lpg_scale"
  | "kitchen_manifold"
  | "gas_stove"
  | "methane_detector"
  | "gas_geyser";

export interface GasComponentSpec {
  id: string;
  name: string;
  category: GasComponentCategory;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  diameterMm?: number;
  material?: string;
  communicationProtocol: string;
  batteryLifeYears?: number;
  batteryPct?: number;
  rssiSignalDbm?: number;
  lastHeartbeat: string;
  currentReading: string;
  pressureMbar?: number;
  flowRateScmh: string;
  status: "normal" | "warning" | "critical" | "offline";
  certification: string;
  description: string;
  installationDate: string;
}

export interface GasAnomalyVerdict {
  status: GasAnomalyKind;
  severity: "low" | "medium" | "high" | "critical";
  headline: string;
  explanation: string;
  recommendedAction: string;
  autoCutoffTriggered: boolean;
  confidence: "low" | "medium" | "high";
  requiresVerification: boolean;
}

export interface GasPressureDecayResult {
  passed: boolean;
  initialMbar: number;
  decayMbar: number;
  durationSeconds: number;
  timestamp: string;
  details: string;
}
