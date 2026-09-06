import { getApiKeys, createApiKey, pickApiKeyForInternalUse } from "@shiguang-gateway/core-domain/control/api-key-store";
import { isCloudEnabled, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { syncToCloud, fetchWithTimeout, CLOUD_URL } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { cloudSyncActionSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function GET() {
  try {
    const enabled = await isCloudEnabled();
    if (!enabled) return Response.json({ enabled: false });
    const machineId = await getConsistentMachineId();
    const apiKey = await pickApiKeyForInternalUse("cloud-sync-verify");
    if (!apiKey || !CLOUD_URL) return Response.json({ enabled: true, connected: false });
    try {
      const pingRes = await fetchWithTimeout(`${CLOUD_URL}/${machineId}/v1/verify`, {
        method: "GET", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      }, 5000);
      return Response.json({ enabled: true, connected: pingRes.ok, lastSync: new Date().toISOString() });
    } catch { return Response.json({ enabled: true, connected: false }); }
  } catch (error) {
    return Response.json({ enabled: false, error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 }); }
  try {
    const validation = validateBody(cloudSyncActionSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const machineId = await getConsistentMachineId();
    switch (validation.data.action) {
      case "enable": {
        const keys = await getApiKeys();
        let createdKey: any = null;
        if (keys.length === 0) createdKey = await createApiKey("Default Key", machineId, []);
        const enableResult = await syncAndVerify(machineId, createdKey?.key, keys);
        const enableBody = await enableResult.clone().json().catch(() => ({}));
        if (enableBody.success) await updateSettings({ cloudEnabled: true });
        return enableResult;
      }
      case "sync": {
        const syncResult: any = await syncToCloud(machineId);
        return syncResult.error ? Response.json(syncResult, { status: 502 }) : Response.json(syncResult);
      }
      case "disable":
        await updateSettings({ cloudEnabled: false });
        return handleDisable(machineId, request);
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.log("Cloud sync error:", error);
    return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

async function syncAndVerify(machineId: string, createdKey: string | undefined, existingKeys: any[]) {
  const syncResult: any = await syncToCloud(machineId, createdKey);
  if (syncResult.error) return Response.json({ error: `Cloud sync failed: ${syncResult.error}` }, { status: 502 });
  const cloudUrl = CLOUD_URL ? `${CLOUD_URL}/${machineId}` : null;
  const apiKey = createdKey || existingKeys[0]?.key;
  if (!apiKey) return Response.json({ ...syncResult, cloudUrl, verified: false, verifyError: "No API key available" });
  let lastVerifyError: string | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const pingResponse = await fetchWithTimeout(`${CLOUD_URL}/${machineId}/v1/verify`, {
        method: "GET", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      }, 5000);
      if (pingResponse.ok) return Response.json({ ...syncResult, cloudUrl, verified: true });
      lastVerifyError = `Ping failed: ${pingResponse.status}`;
    } catch (error: any) { lastVerifyError = error?.name === "AbortError" ? "Verify timeout" : error?.message; }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return Response.json({ ...syncResult, cloudUrl, verified: false, verifyError: lastVerifyError || "Verification failed after retries" });
}

async function handleDisable(machineId: string, request: Request) {
  if (!CLOUD_URL) return Response.json({ error: "NEXT_PUBLIC_CLOUD_URL is not configured" }, { status: 500 });
  let response: Response;
  try { response = await fetchWithTimeout(`${CLOUD_URL}/sync/${machineId}`, { method: "DELETE" }); }
  catch (error: any) { return Response.json({ error: error?.name === "AbortError" ? "Cloud disable timeout" : "Failed to reach cloud service" }, { status: 502 }); }
  if (!response.ok) { console.log("Cloud disable failed:", await response.text()); return Response.json({ error: "Failed to disable cloud" }, { status: 502 }); }
  const host = request.headers.get("host") || new URL(process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:8787").host;
  await updateClaudeSettingsToLocal(machineId, host);
  return Response.json({ success: true, message: "Cloud disabled" });
}

async function updateClaudeSettingsToLocal(machineId: string, host: string) {
  try {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    const cloudUrl = `${CLOUD_URL}/${machineId}`;
    const localUrl = `http://${host}`;
    let settings: any;
    try { settings = JSON.parse(await fs.readFile(settingsPath, "utf-8")); }
    catch (error: any) { if (error?.code === "ENOENT") return; throw error; }
    if (settings.env?.ANTHROPIC_BASE_URL !== cloudUrl) return;
    settings.env.ANTHROPIC_BASE_URL = localUrl;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`Updated Claude CLI settings: ${cloudUrl} → ${localUrl}`);
  } catch (error: any) { console.log("Failed to update Claude CLI settings:", error?.message); }
}
