import { getSupervisor, getServiceRow } from "@shiguang-gateway/core-domain/shared/version-manager";
import { getInstalledVersion, getLatestVersion, MUX_DEFAULT_PORT, update as updateMux } from "@shiguang-gateway/core-domain/control/mux";
import { createErrorResponse } from "@shiguang-gateway/core-domain/shared/error-response";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { getOrInitSupervisor } from "../_lib.js";

const TOOL = "mux";

export async function start(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "Mux não está instalado." });
    return Response.json(await (await getOrInitSupervisor()).start());
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function restart(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "Mux não está instalado." });
    return Response.json(await (await getOrInitSupervisor()).restart());
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function stop(): Promise<Response> {
  try {
    const supervisor = getSupervisor(TOOL);
    if (!supervisor) return Response.json({ tool: TOOL, state: "stopped" });
    return Response.json(await supervisor.stop());
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function status(): Promise<Response> {
  try {
    const supervisor = getSupervisor(TOOL);
    const row = await getServiceRow(TOOL);
    const liveStatus = supervisor?.getStatus() ?? null;
    const installedVersion = await getInstalledVersion();
    const latestVersion = await getLatestVersion();
    return Response.json({
      tool: TOOL,
      state: liveStatus?.state ?? row?.status ?? "unknown",
      pid: liveStatus?.pid ?? null,
      port: liveStatus?.port ?? row?.port ?? MUX_DEFAULT_PORT,
      health: liveStatus?.health ?? "unknown",
      startedAt: liveStatus?.startedAt ?? null,
      lastError: liveStatus?.lastError ?? row?.errorMessage ?? null,
      installedVersion: installedVersion ?? row?.installedVersion ?? null,
      latestVersion,
      updateAvailable: !!installedVersion && !!latestVersion && installedVersion !== latestVersion,
      autoStart: row?.autoStart ?? false,
      adopted: liveStatus?.adopted ?? false,
      autoRestartAdopted: row?.autoRestartAdopted ?? false,
    });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function update(): Promise<Response> {
  try {
    const [installed, latest] = await Promise.all([getInstalledVersion(), getLatestVersion()]);
    if (installed && latest && installed === latest) return Response.json({ updated: false, installedVersion: installed, latestVersion: latest });
    const supervisor = getSupervisor(TOOL);
    const wasRunning = supervisor?.getStatus().state === "running";
    if (wasRunning && supervisor) await supervisor.stop();
    const result = await updateMux();
    if (wasRunning) await (await getOrInitSupervisor()).start().catch((error: unknown) => console.warn("[Services] Could not restart mux after update:", error instanceof Error ? error.message : String(error)));
    return Response.json({ updated: true, oldVersion: installed ?? null, newVersion: result.installedVersion });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}
