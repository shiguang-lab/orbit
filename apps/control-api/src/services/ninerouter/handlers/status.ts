import {
  getNineRouterInstalledVersion,
  getNineRouterLatestVersion,
  getOrCreateApiKey,
  getSupervisor,
  maskApiKey,
} from "@shiguang-gateway/core-domain/shared/embedded-services";
import { getServiceRow } from "@shiguang-gateway/core-domain/shared/version-manager";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";
import { logAuditEvent } from "@shiguang-gateway/core-domain/control/compliance";

const TOOL = "9router";

export async function status(request: Request = new Request("http://localhost/")): Promise<Response> {
  try {
    const reveal = new URL(request.url).searchParams.get("reveal");
    const sup = getSupervisor(TOOL);
    const row = await getServiceRow(TOOL);
    const liveStatus = sup?.getStatus() ?? null;
    const installedVersion = await getNineRouterInstalledVersion();
    const latestVersion = await getNineRouterLatestVersion();
    const apiKey = row?.status !== "not_installed" ? await getOrCreateApiKey(TOOL).catch(() => null) : null;
    const base = {
      tool: TOOL,
      state: liveStatus?.state ?? row?.status ?? "unknown",
      pid: liveStatus?.pid ?? null,
      port: liveStatus?.port ?? row?.port ?? 20130,
      health: liveStatus?.health ?? "unknown",
      startedAt: liveStatus?.startedAt ?? null,
      lastError: liveStatus?.lastError ?? row?.errorMessage ?? null,
      installedVersion: installedVersion ?? row?.installedVersion ?? null,
      latestVersion,
      updateAvailable: !!installedVersion && !!latestVersion && installedVersion !== latestVersion,
      apiKeyMasked: apiKey ? maskApiKey(apiKey) : null,
      autoStart: row?.autoStart ?? false,
      providerExpose: row?.providerExpose ?? false,
      adopted: liveStatus?.adopted ?? false,
      autoRestartAdopted: row?.autoRestartAdopted ?? false,
    };
    if (reveal !== "key") return Response.json(base);
    if (request.headers.get("X-Reveal-Confirm") !== "yes") {
      return createErrorResponse({ status: 403, message: "Missing confirmation header. Send X-Reveal-Confirm: yes to reveal the key." });
    }
    if (!apiKey) return createErrorResponse({ status: 404, message: "No API key found for 9router." });
    try {
      logAuditEvent({ action: "service.reveal_api_key", target: TOOL, resourceType: "service", status: "success", details: { tool: TOOL } });
    } catch { /* best effort */ }
    return Response.json({ ...base, apiKeyPlain: apiKey });
  } catch (error) {
    return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) });
  }
}
