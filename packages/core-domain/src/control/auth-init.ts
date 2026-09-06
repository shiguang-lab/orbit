import { safeOutboundFetch, SafeOutboundFetchError, getSafeOutboundFetchErrorStatus } from "../shared/network/safeOutboundFetch.ts";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import ensureCloudSyncInitialized from "../lib/initCloudSync.ts";

export type ControlResult = { status: number; body: unknown };

export async function issueDahlTokens(): Promise<ControlResult> {
  try {
    const response = await safeOutboundFetch("https://inference.dahl.global/tokens", { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!response.ok) return { status: response.status, body: { error: `Upstream ${response.status}`, detail: sanitizeErrorMessage(await response.text().catch(() => "")) } };
    return { status: response.status, body: await response.json() };
  } catch (error) {
    if (error instanceof SafeOutboundFetchError) return { status: getSafeOutboundFetchErrorStatus(error) ?? 502, body: { error: "Upstream fetch failed", detail: sanitizeErrorMessage(error.message) } };
    return { status: 500, body: { error: "Internal error", detail: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) } };
  }
}

export async function initializeControlRuntime(): Promise<ControlResult> {
  return { status: 200, body: { initialized: await ensureCloudSyncInitialized() } };
}
