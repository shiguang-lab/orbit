import { getSupervisor, getServiceRow } from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { getInstalledVersion, getLatestVersion, update as downloadUpdate, CLIPROXY_DEFAULT_PORT, resolvePortPid } from "@shiguang-gateway/core-domain/control/cliproxy";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";
import { getOrInitSupervisor } from "../_lib.js";

const TOOL = "cliproxy";

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { process.kill(pid, 0); }
    catch { return; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export async function start(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "CLIProxyAPI não está instalado." });
    return Response.json(await (await getOrInitSupervisor()).start());
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function restart(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "CLIProxyAPI não está instalado." });
    const supervisor = await getOrInitSupervisor();
    let status = await supervisor.restart();
    if (status.adopted && status.pid === null) {
      const pid = await resolvePortPid(row.port);
      if (pid !== null) {
        try { process.kill(pid, "SIGTERM"); } catch { /* process exited between lookup and signal */ }
        await waitForProcessExit(pid, 15_000);
      }
      await supervisor.stop();
      status = await supervisor.start();
    }
    return Response.json(status);
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function stop(): Promise<Response> {
  try {
    const row = await getServiceRow(TOOL);
    const existing = getSupervisor(TOOL);
    if (!existing && (!row || row.status !== "running")) return Response.json({ tool: TOOL, state: "stopped" });
    const supervisor = existing ?? (await getOrInitSupervisor());
    if (!existing && row?.status === "running") await supervisor.start();
    return Response.json(await supervisor.stop());
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}

export async function status(): Promise<Response> {
  try {
    const supervisor = getSupervisor(TOOL);
    const row = await getServiceRow(TOOL);
    let liveStatus = supervisor?.getStatus() ?? null;
    if (row?.status === "running" && (!liveStatus || liveStatus.pid === null)) {
      const pid = await resolvePortPid(row.port);
      if (pid !== null) liveStatus = liveStatus ? { ...liveStatus, pid } : { tool: TOOL, state: "running", pid, port: row.port, health: "unknown", startedAt: null, lastError: row.errorMessage ?? null, adopted: true };
    }
    const installedVersion = await getInstalledVersion();
    const latestVersion = await getLatestVersion();
    return Response.json({
      tool: TOOL,
      state: liveStatus?.state ?? row?.status ?? "unknown",
      pid: liveStatus?.pid ?? null,
      port: liveStatus?.port ?? row?.port ?? CLIPROXY_DEFAULT_PORT,
      health: liveStatus?.health ?? "unknown",
      startedAt: liveStatus?.startedAt ?? null,
      lastError: liveStatus?.lastError ?? row?.errorMessage ?? null,
      installedVersion: installedVersion ?? row?.installedVersion ?? null,
      latestVersion,
      updateAvailable: !!installedVersion && !!latestVersion && installedVersion !== latestVersion,
      autoStart: row?.autoStart ?? false,
      providerExpose: row?.providerExpose ?? false,
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
    const result = await downloadUpdate();
    if (wasRunning) await (await getOrInitSupervisor()).start().catch((error: unknown) => console.warn("[Services] Could not restart cliproxy after update:", error instanceof Error ? error.message : String(error)));
    return Response.json({ updated: true, oldVersion: installed ?? null, newVersion: result.installedVersion });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
}
