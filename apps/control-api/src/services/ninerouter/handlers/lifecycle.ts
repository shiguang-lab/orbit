import {
  getOrCreateApiKey,
  getSupervisor,
  getServiceModels,
  getNineRouterInstalledVersion,
  getNineRouterLatestVersion,
  generateServiceApiKey,
  resolveNineRouterSpawnArgs,
  registerSupervisor,
  unregisterSupervisor,
  ServiceSupervisor,
  updateNineRouter,
} from "@shiguang-gateway/core-domain/shared/embedded-services";
import { getServiceRow } from "@shiguang-gateway/core-domain/shared/version-manager";
import { updateServiceField } from "@shiguang-gateway/core-domain/shared/version-manager";
import { encrypt } from "@shiguang-gateway/core-domain/db/encryption";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

const TOOL = "9router";
const PORT = 20130;
let initInFlight: Promise<InstanceType<typeof ServiceSupervisor>> | null = null;

async function getOrInitSupervisor(): Promise<InstanceType<typeof ServiceSupervisor>> {
  const existing = getSupervisor(TOOL);
  if (existing) return existing as InstanceType<typeof ServiceSupervisor>;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    const racy = getSupervisor(TOOL);
    if (racy) return racy as InstanceType<typeof ServiceSupervisor>;
    const apiKey = await getOrCreateApiKey(TOOL);
    const supervisor = new ServiceSupervisor({ tool: TOOL, port: PORT, spawnArgs: () => resolveNineRouterSpawnArgs(apiKey, PORT), healthUrl: () => `http://127.0.0.1:${PORT}/api/health`, healthIntervalMs: 2_000, stopTimeoutMs: 15_000, logsBufferBytes: 5_242_880, probeBeforeSpawn: true });
    registerSupervisor(supervisor);
    return supervisor;
  })().finally(() => { initInFlight = null; });
  return initInFlight;
}

export async function start(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "9router não está instalado." });
    return Response.json(await getOrInitSupervisor().then((sup) => sup.start()));
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function restart(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "9router não está instalado." });
    return Response.json(await getOrInitSupervisor().then((sup) => sup.restart()));
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function stop(): Promise<Response> {
  try {
    const supervisor = getSupervisor(TOOL);
    if (!supervisor) return Response.json({ tool: TOOL, state: "stopped" });
    return Response.json(await supervisor.stop());
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function rotateKey(): Promise<Response> {
  try {
    const newKey = generateServiceApiKey("nr");
    await updateServiceField(TOOL, "apiKey", encrypt(newKey) ?? newKey);
    const supervisor = getSupervisor(TOOL);
    const wasRunning = supervisor?.getStatus().state === "running";
    let restarted = false;
    if (wasRunning && supervisor) {
      await supervisor.stop();
      unregisterSupervisor(TOOL);
      await (await getOrInitSupervisor()).start();
      restarted = true;
    }
    return Response.json({ keyRotated: true, restarted });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function update(): Promise<Response> {
  try {
    const [installed, latest] = await Promise.all([getNineRouterInstalledVersion(), getNineRouterLatestVersion()]);
    if (installed && latest && installed === latest) return Response.json({ updated: false, installedVersion: installed, latestVersion: latest });
    const supervisor = getSupervisor(TOOL);
    const wasRunning = supervisor?.getStatus().state === "running";
    if (wasRunning && supervisor) await supervisor.stop();
    const result = await updateNineRouter();
    if (wasRunning) await (await getOrInitSupervisor()).start().catch((error: unknown) => console.warn("[Services] Could not restart 9router after update:", error instanceof Error ? error.message : String(error)));
    return Response.json({ updated: true, oldVersion: installed ?? null, newVersion: result.installedVersion });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}
