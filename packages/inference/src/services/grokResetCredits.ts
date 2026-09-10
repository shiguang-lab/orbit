import { getProviderConnectionById } from "@orbit/core/db/provider-connections";
import { isConnectionUnavailableToAuxiliaryActivity } from "@orbit/core/shared/connection-isolation";
import { fetchAndPersistProviderLimits, refreshAndUpdateCredentials } from "./providerLimits.ts";
import {
  decodeGrokGrpcStatus,
  decodeGrokResetCreditsFrame,
  encodeGrpcWebRequest,
  encodeRedeemResetRequest,
} from "./grokResetCreditsFrame.ts";
import { sanitizeErrorMessage } from "@orbit/utils/errors";

const LIST_URL = "https://grok.com/prod_mc_billing.ConsumerUiSvc/GetRemainingResets";
const REDEEM_URL = "https://grok.com/prod_mc_billing.ConsumerUiSvc/RedeemReset";
const EMPTY_FRAME = Buffer.from([0, 0, 0, 0, 0]);

type Connection = Record<string, unknown> & { id: string; provider: string; accessToken?: string };
export class GrokResetCreditError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "GrokResetCreditError"; }
}

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/grpc-web+proto", "X-Grpc-Web": "1" };
}

async function load(connectionId: string): Promise<Connection> {
  if (await isConnectionUnavailableToAuxiliaryActivity(connectionId)) throw new GrokResetCreditError(409, "exclusive_lease_active", "Reset-credit operations are deferred while an exclusive lease is active.");
  const connection = await getProviderConnectionById(connectionId) as unknown as Connection | null;
  if (!connection) throw new GrokResetCreditError(404, "connection_not_found", "Connection not found.");
  if (connection.provider !== "grok-cli") throw new GrokResetCreditError(400, "grok_provider_required", "Grok reset credits require a Grok CLI connection.");
  const refreshed = await refreshAndUpdateCredentials(connection, { allowRotatingRefresh: true });
  const result = refreshed.connection as Connection;
  if (!result.accessToken) throw new GrokResetCreditError(401, "grok_access_token_missing", "Grok OAuth access token is missing.");
  return result;
}

async function listWithToken(token: string) {
  const response = await fetch(LIST_URL, { method: "POST", headers: headers(token), body: EMPTY_FRAME, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new GrokResetCreditError(response.status, "grok_reset_credit_upstream_error", `Grok remaining-resets returned HTTP ${response.status}.`);
  const decoded = decodeGrokResetCreditsFrame(Buffer.from(await response.arrayBuffer()));
  if (!decoded.ok) throw new GrokResetCreditError(502, "grok_reset_credit_decode_failed", "Grok remaining-resets response could not be decoded.");
  return decoded.tokens
    .sort((a, b) => (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999"))
    .map((credit) => ({ selectionToken: credit.tokenId, expiresAt: credit.expiresAt }));
}

export async function fetchGrokResetCredits(accessToken: string): Promise<{ count: number; nextExpiresAt: string | null } | null> {
  try {
    const response = await fetch(LIST_URL, { method: "POST", headers: headers(accessToken), body: EMPTY_FRAME, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const decoded = decodeGrokResetCreditsFrame(Buffer.from(await response.arrayBuffer()));
    return decoded.ok ? decoded.snapshot : null;
  } catch { return null; }
}

export async function listGrokResetCredits(connectionId: string) {
  try {
    const connection = await load(connectionId);
    const credits = await listWithToken(connection.accessToken!);
    return { availableCount: credits.length, credits };
  } catch (error) {
    if (error instanceof GrokResetCreditError) throw error;
    throw new GrokResetCreditError(500, "grok_reset_credit_list_failed", sanitizeErrorMessage(error) || "Failed to load Grok reset credits.");
  }
}

export async function consumeGrokResetCredit(connectionId: string, _idempotencyKey: string, creditId?: string) {
  try {
    const connection = await load(connectionId);
    const selected = creditId?.trim() || (await listWithToken(connection.accessToken!))[0]?.selectionToken;
    if (!selected) throw new GrokResetCreditError(409, "no_credit", "No Grok reset credits are available.");
    const payload = encodeGrpcWebRequest(encodeRedeemResetRequest(selected));
    const response = await fetch(REDEEM_URL, { method: "POST", headers: headers(connection.accessToken!), body: new Uint8Array(payload), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new GrokResetCreditError(response.status, "grok_reset_credit_upstream_error", `Grok reset returned HTTP ${response.status}.`);
    const rpc = decodeGrokGrpcStatus(Buffer.from(await response.arrayBuffer()), response.headers.get("grpc-status"));
    if (rpc.status !== "0") {
      if (rpc.status === "9" && rpc.message?.toLowerCase().includes("already")) return { outcome: "alreadyRedeemed", usage: (await fetchAndPersistProviderLimits(connectionId, "manual", { allowRotatingRefresh: true })).usage };
      if (rpc.status === "9" || rpc.status === "3") throw new GrokResetCreditError(409, "no_credit", "No Grok reset credits are available.");
      throw new GrokResetCreditError(502, "unknown_reset_credit_response", rpc.message || `Grok reset failed (grpc-status ${rpc.status}).`);
    }
    const refreshed = await fetchAndPersistProviderLimits(connectionId, "manual", { allowRotatingRefresh: true });
    return { outcome: "reset", usage: refreshed.usage };
  } catch (error) {
    if (error instanceof GrokResetCreditError) throw error;
    throw new GrokResetCreditError(500, "grok_reset_credit_failed", sanitizeErrorMessage(error) || "Failed to redeem Grok reset credit.");
  }
}
