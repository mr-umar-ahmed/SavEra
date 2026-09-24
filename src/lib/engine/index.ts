/**
 * SAVERA engine barrel — pure, deterministic, unit-tested (ARCHITECTURE §6).
 * All numbers shown in the product come from here, never from an LLM.
 */

// Electricity
export * from "./appliances";
export * from "./baseline";
export * from "./confidence";
export * from "./reconcile";
export * from "./mom";
export * from "./anomaly";
export * from "./forecast";
export * from "./tariff";
export * from "./recommend";
export * from "./energyProfile";
export * from "./completeness";
export * from "./twin";
export * from "./explain";

// Green Score, LPG, water, aggregates, carbon, GHG
export * from "./greenScore";
export * from "./lpg";
export * from "./water";
export * from "./aggregate";
export * from "./carbon";
export * from "./ghg";
