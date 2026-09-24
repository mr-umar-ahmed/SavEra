/**
 * One function per backend route, so paths and query names live in exactly one
 * place. Each takes the caller's bearer token; `lib/api.server.ts` and
 * `lib/api.client.ts` are what find that token in their environment.
 */
import { apiFetch, type ApiOptions } from "@/lib/api";
import type {
  Alert,
  AnomalyWard,
  Appliance,
  ApplianceInput,
  ApplianceTypeInfo,
  ComparisonWard,
  Dashboard,
  ElectricityInsights,
  ElectricityReading,
  ElectricityReadingInput,
  GreenScoreInsights,
  HeatmapResponse,
  LpgCurrent,
  LpgCycle,
  LpgInsights,
  OcrJob,
  OcrJobCreated,
  PeerComparison,
  Profile,
  ProfileUpdate,
  ResourceType,
  SupervisorWard,
  Ward,
  WaterInsights,
  WaterReading,
  WaterReadingCreated,
  WaterReadingInput,
} from "@/lib/types";

/** Everything a call site may vary besides the payload itself. */
export type Ctx = Pick<ApiOptions, "token" | "signal" | "timeoutMs" | "cache">;

// --- profile ---------------------------------------------------------------

export function getProfile(ctx: Ctx) {
  return apiFetch<Profile>("/profile", ctx);
}

export function updateProfile(patch: ProfileUpdate, ctx: Ctx) {
  return apiFetch<Profile>("/profile", { ...ctx, method: "PATCH", body: patch });
}

export function getWards(city: string | undefined, ctx: Ctx) {
  return apiFetch<Ward[]>("/wards", { ...ctx, query: { city } });
}

export function getAppliances(ctx: Ctx) {
  return apiFetch<Appliance[]>("/profile/appliances", ctx);
}

/** Replace-all: the list you send *is* the profile (an empty list clears it). */
export function putAppliances(appliances: ApplianceInput[], ctx: Ctx) {
  return apiFetch<Appliance[]>("/profile/appliances", {
    ...ctx,
    method: "PUT",
    body: { appliances },
  });
}

export function getApplianceTypes(ctx: Ctx) {
  return apiFetch<ApplianceTypeInfo[]>("/profile/appliance-types", ctx);
}

export function setPushToken(fcmToken: string, ctx: Ctx) {
  return apiFetch<void>("/profile/push-token", {
    ...ctx,
    method: "PUT",
    body: { fcm_token: fcmToken },
  });
}

export function clearPushToken(ctx: Ctx) {
  return apiFetch<void>("/profile/push-token", { ...ctx, method: "DELETE" });
}

// --- electricity -----------------------------------------------------------

export function getElectricityReadings(limit: number | undefined, ctx: Ctx) {
  return apiFetch<ElectricityReading[]>("/readings/electricity", { ...ctx, query: { limit } });
}

/**
 * Saves a bill. Answers 409 when the period overlaps one already saved, unless
 * `overwrite` is set — which is what the OCR confirmation screen sends after
 * the user agrees to replace it.
 */
export function createElectricityReading(
  body: ElectricityReadingInput,
  ctx: Ctx & { overwrite?: boolean },
) {
  const { overwrite, ...rest } = ctx;
  return apiFetch<ElectricityReading>("/readings/electricity", {
    ...rest,
    method: "POST",
    body,
    query: overwrite ? { overwrite: true } : undefined,
  });
}

export function deleteElectricityReading(id: string, ctx: Ctx) {
  return apiFetch<void>(`/readings/electricity/${id}`, { ...ctx, method: "DELETE" });
}

// --- water -----------------------------------------------------------------

export function getWaterReadings(days: number | undefined, ctx: Ctx) {
  return apiFetch<WaterReading[]>("/readings/water", { ...ctx, query: { days } });
}

/** Logging the same day twice corrects it; the reply says whether it replaced. */
export function createWaterReading(body: WaterReadingInput, ctx: Ctx) {
  return apiFetch<WaterReadingCreated>("/readings/water", { ...ctx, method: "POST", body });
}

export function deleteWaterReading(id: string, ctx: Ctx) {
  return apiFetch<void>(`/readings/water/${id}`, { ...ctx, method: "DELETE" });
}

// --- LPG -------------------------------------------------------------------

export function getLpgCycles(limit: number | undefined, ctx: Ctx) {
  return apiFetch<LpgCycle[]>("/lpg/cycles", { ...ctx, query: { limit } });
}

export function getLpgCurrent(ctx: Ctx) {
  return apiFetch<LpgCurrent>("/lpg/current", ctx);
}

/** 409 when a cylinder is already open. */
export function startLpgCycle(body: { start_date: string; cylinder_kg?: number }, ctx: Ctx) {
  return apiFetch<LpgCycle>("/lpg/cycles", { ...ctx, method: "POST", body });
}

export function closeLpgCycle(id: string, endDate: string, ctx: Ctx) {
  return apiFetch<LpgCycle>(`/lpg/cycles/${id}/close`, {
    ...ctx,
    method: "POST",
    body: { end_date: endDate },
  });
}

// --- bill OCR --------------------------------------------------------------

/** Answers 202 immediately; the OCR runs in the background. */
export function uploadBill(file: File, ctx: Ctx) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<OcrJobCreated>("/bills/upload", {
    ...ctx,
    method: "POST",
    body: form,
    // Vision plus the upload itself can outlast the default 8 s budget.
    timeoutMs: ctx.timeoutMs ?? 30_000,
  });
}

export function getBillJob(id: string, ctx: Ctx) {
  return apiFetch<OcrJob>(`/bills/jobs/${id}`, ctx);
}

// --- alerts ----------------------------------------------------------------

export function getAlerts(
  opts: { unreadOnly?: boolean; limit?: number } | undefined,
  ctx: Ctx,
) {
  return apiFetch<Alert[]>("/alerts", {
    ...ctx,
    query: { unread_only: opts?.unreadOnly, limit: opts?.limit },
  });
}

export function getUnreadCount(ctx: Ctx) {
  return apiFetch<{ count: number }>("/alerts/unread-count", ctx);
}

export function markAlertRead(id: string, ctx: Ctx) {
  return apiFetch<Alert>(`/alerts/${id}/read`, { ...ctx, method: "POST" });
}

export function markAllAlertsRead(ctx: Ctx) {
  return apiFetch<{ updated: number }>("/alerts/read-all", { ...ctx, method: "POST" });
}

// --- insights --------------------------------------------------------------

/** Everything the home screen shows, in one round trip. */
export function getDashboard(ctx: Ctx) {
  return apiFetch<Dashboard>("/insights/dashboard", ctx);
}

export function getElectricityInsights(months: number | undefined, ctx: Ctx) {
  return apiFetch<ElectricityInsights>("/insights/electricity", { ...ctx, query: { months } });
}

export function getWaterInsights(days: number | undefined, ctx: Ctx) {
  return apiFetch<WaterInsights>("/insights/water", { ...ctx, query: { days } });
}

export function getLpgInsights(ctx: Ctx) {
  return apiFetch<LpgInsights>("/insights/lpg", ctx);
}

export function getGreenScoreInsights(months: number | undefined, ctx: Ctx) {
  return apiFetch<GreenScoreInsights>("/insights/green-score", { ...ctx, query: { months } });
}

/** Ward average for one resource — answers `available: false` below 10 households. */
export function getPeerComparison(resource: ResourceType, ctx: Ctx) {
  return apiFetch<PeerComparison>("/insights/peer-comparison", { ...ctx, query: { resource } });
}

// --- supervisor --------------------------------------------------------------

export function getSupervisorWards(ctx: Ctx) {
  return apiFetch<SupervisorWard[]>("/supervisor/wards", ctx);
}

export function getWardHeatmap(wardId: number, ctx: Ctx) {
  return apiFetch<HeatmapResponse>(`/supervisor/wards/${wardId}/heatmap`, ctx);
}

export function getSupervisorAnomalies(month: string | undefined, ctx: Ctx) {
  return apiFetch<AnomalyWard[]>("/supervisor/anomalies", { ...ctx, query: { month } });
}

export function getSupervisorComparison(
  resource: ResourceType,
  month: string | undefined,
  ctx: Ctx,
) {
  return apiFetch<ComparisonWard[]>("/supervisor/comparison", {
    ...ctx,
    query: { resource, month },
  });
}
