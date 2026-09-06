import { Injectable } from "@nestjs/common";
import {
  ServiceSupervisor,
  getServiceRow,
  getSupervisor,
  registerSupervisor,
  updateServiceField,
} from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import {
  BIFROST_DEFAULT_PORT,
  getBifrostInstalledVersion,
  getBifrostLatestVersion,
  installBifrost,
  resolveBifrostSpawnArgs,
  updateBifrost,
} from "@shiguang-gateway/core-domain/control/embedded-services-install";

const TOOL = "bifrost";

@Injectable()
export class BifrostService {
  async install(version = "latest") {
    return installBifrost(version);
  }

  async status() {
    const supervisor = getSupervisor(TOOL);
    const row = await getServiceRow(TOOL);
    const liveStatus = supervisor?.getStatus() ?? null;
    const live = liveStatus as (typeof liveStatus & {
      startedAt?: string | null;
      adopted?: boolean;
    });
    const installedVersion = await getBifrostInstalledVersion();
    const latestVersion = await getBifrostLatestVersion();

    return {
      tool: TOOL,
      state: liveStatus?.state ?? row?.status ?? "unknown",
      pid: liveStatus?.pid ?? null,
      port: liveStatus?.port ?? row?.port ?? BIFROST_DEFAULT_PORT,
      health: liveStatus?.health ?? "unknown",
      startedAt: live?.startedAt ?? null,
      lastError: liveStatus?.lastError ?? row?.errorMessage ?? null,
      installedVersion: installedVersion ?? row?.installedVersion ?? null,
      latestVersion,
      updateAvailable: !!installedVersion && !!latestVersion && installedVersion !== latestVersion,
      autoStart: row?.autoStart ?? false,
      adopted: live?.adopted ?? false,
      autoRestartAdopted: row?.autoRestartAdopted ?? false,
    };
  }

  async start() {
    await this.ensureInstalled();
    const status = await (await this.getOrInitSupervisor()).start();
    return status;
  }

  async stop() {
    const supervisor = getSupervisor(TOOL);
    if (!supervisor) return { tool: TOOL, state: "stopped" };
    return supervisor.stop().then(() => ({ tool: TOOL, state: "stopped" }));
  }

  async restart() {
    await this.ensureInstalled();
    return (await this.getOrInitSupervisor()).restart();
  }

  async update() {
    const [installed, latest] = await Promise.all([
      getBifrostInstalledVersion(),
      getBifrostLatestVersion(),
    ]);
    if (installed && latest && installed === latest) {
      return { updated: false, installedVersion: installed, latestVersion: latest };
    }

    const supervisor = getSupervisor(TOOL);
    const wasRunning = supervisor?.getStatus().state === "running";
    if (wasRunning && supervisor) await supervisor.stop();

    const result = await updateBifrost();
    if (wasRunning) {
      await (await this.getOrInitSupervisor()).start().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[Services] Could not restart bifrost after update:", message);
      });
    }
    return {
      updated: true,
      oldVersion: installed ?? null,
      newVersion: result.installedVersion,
    };
  }

  setAutoStart(enabled: boolean) {
    return updateServiceField(TOOL, "autoStart", enabled);
  }

  setAutoRestartAdopted(enabled: boolean) {
    return updateServiceField(TOOL, "autoRestartAdopted", enabled);
  }

  private async ensureInstalled() {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") {
      const error = new Error("Bifrost não está instalado.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }
  }

  async getOrInitSupervisor(): Promise<ServiceSupervisor> {
    const existing = getSupervisor(TOOL);
    if (existing) return existing as ServiceSupervisor;

    const port = parseInt(process.env.BIFROST_PORT ?? String(BIFROST_DEFAULT_PORT), 10);
    const supervisor = new ServiceSupervisor({
      tool: TOOL,
      port,
      spawnArgs: () => resolveBifrostSpawnArgs(port),
      healthUrl: () => `http://127.0.0.1:${port}/v1/models`,
      healthIntervalMs: 5_000,
      stopTimeoutMs: 15_000,
      logsBufferBytes: 5_242_880,
      probeBeforeSpawn: true,
    });
    registerSupervisor(supervisor);
    return supervisor;
  }
}
