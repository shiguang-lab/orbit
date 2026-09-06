import { Injectable } from "@nestjs/common";
import { getSupervisor, getServiceRow, registerSupervisor, ServiceSupervisor, getOrCreateApiKey, updateServiceField } from "@shiguang-gateway/core-domain/shared/version-manager";
import { DARIO_DEFAULT_PORT, getInstalledVersion, getLatestVersion, install, resolveSpawnArgs, update as updateDario } from "@shiguang-gateway/core-domain/control/dario-installer";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";
import { InstallError, SERVICE_VERSION_PATTERN } from "@shiguang-gateway/core-domain/shared/embedded-services";
import { z } from "zod";

const TOOL = "dario";
const installBody = z.object({ version: z.string().regex(SERVICE_VERSION_PATTERN, "Invalid version").optional().default("latest") });
const toggleBody = z.object({ enabled: z.boolean() });

@Injectable()
export class DarioService {
  async install(request: Request): Promise<Response> {
    let body: unknown; try { body = request.body === null ? {} : await request.json(); } catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }
    const parsed = installBody.safeParse(body); if (!parsed.success) return createErrorResponse({ status: 400, message: parsed.error.message });
    try { return Response.json({ ok: true, ...(await install(parsed.data.version)) }); }
    catch (error) { if (error instanceof InstallError) return createErrorResponse({ status: error.httpStatus, message: error.friendly }); return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
  }

  async status(): Promise<Response> { try {
    const sup = getSupervisor(TOOL); const row = await getServiceRow(TOOL); const live = sup?.getStatus() as any;
    const installed = await getInstalledVersion(); const latest = await getLatestVersion();
    return Response.json({ tool: TOOL, state: live?.state ?? row?.status ?? "unknown", pid: live?.pid ?? null, port: live?.port ?? row?.port ?? DARIO_DEFAULT_PORT, health: live?.health ?? "unknown", startedAt: live?.startedAt ?? null, lastError: live?.lastError ?? row?.errorMessage ?? null, installedVersion: installed ?? row?.installedVersion ?? null, latestVersion: latest, updateAvailable: !!installed && !!latest && installed !== latest, autoStart: row?.autoStart ?? false, adopted: live?.adopted ?? false, autoRestartAdopted: row?.autoRestartAdopted ?? false });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); } }

  async toggle(request: Request, field: "autoStart" | "autoRestartAdopted"): Promise<Response> {
    let body: unknown; try { body = await request.json(); } catch { return createErrorResponse({ status: 400, message: "Invalid JSON body" }); }
    const parsed = toggleBody.safeParse(body); if (!parsed.success) return createErrorResponse({ status: 400, message: parsed.error.message });
    try { await updateServiceField(TOOL, field, parsed.data.enabled); return new Response(null, { status: 204 }); }
    catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); }
  }

  async start(): Promise<Response> { return this.lifecycle("start"); }
  async restart(): Promise<Response> { return this.lifecycle("restart"); }
  async stop(): Promise<Response> { try { const sup = getSupervisor(TOOL); if (!sup) return Response.json({ tool: TOOL, state: "stopped" }); return Response.json(await sup.stop().then(() => ({ tool: TOOL, state: "stopped" }))); } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); } }
  async update(): Promise<Response> { try {
    const [installed, latest] = await Promise.all([getInstalledVersion(), getLatestVersion()]); if (installed && latest && installed === latest) return Response.json({ updated: false, installedVersion: installed, latestVersion: latest });
    const sup = getSupervisor(TOOL); const wasRunning = sup?.getStatus().state === "running"; if (wasRunning && sup) await sup.stop(); const result = await updateDario();
    if (wasRunning) await (await this.getOrInitSupervisor()).start().catch((error: unknown) => console.warn("[Services] Could not restart dario after update:", sanitizeErrorMessage(error instanceof Error ? error.message : String(error))));
    return Response.json({ updated: true, oldVersion: installed ?? null, newVersion: result.installedVersion });
  } catch (error) { return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); } }

  private async lifecycle(action: "start" | "restart"): Promise<Response> { try {
    const row = await getServiceRow(TOOL); if (!row || row.status === "not_installed") return createErrorResponse({ status: 409, message: "Dario não está instalado." });
    return Response.json(await (await this.getOrInitSupervisor())[action]());
  } catch (error) { return createErrorResponse({ status: 503, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }); } }

  async getOrInitSupervisor(): Promise<ServiceSupervisor> { const existing = getSupervisor(TOOL); if (existing) return existing as ServiceSupervisor; const port = Number.parseInt(process.env.DARIO_PORT ?? String(DARIO_DEFAULT_PORT), 10); const key = await getOrCreateApiKey(TOOL); const sup = new ServiceSupervisor({ tool: TOOL, port, spawnArgs: () => resolveSpawnArgs(key, port), healthUrl: () => `http://127.0.0.1:${port}/health`, healthIntervalMs: 5000, stopTimeoutMs: 15000, logsBufferBytes: 5242880, probeBeforeSpawn: true }); registerSupervisor(sup); return sup; }
}
