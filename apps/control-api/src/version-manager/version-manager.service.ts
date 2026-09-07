import { Injectable } from "@nestjs/common";
import {
  ServiceSupervisor,
  getServiceRow,
  getSupervisor,
  getVersionManagerStatus,
  registerSupervisor,
} from "@orbit/core/control/embedded-services-lifecycle";
import { getOrCreateApiKey } from "@orbit/core/embedded-services/api-key";
import {
  CLIPROXY_DEFAULT_PORT,
  getCliproxyInstalledVersion as getInstalledVersion,
  getCliproxyLatestVersion as getLatestVersion,
  installCliproxy as install,
  resolveCliproxySpawnArgs as resolveSpawnArgs,
} from "@orbit/core/control/embedded-services-install";

const TOOL = "cliproxy";
const SUPERVISOR_TOOLS = new Set([TOOL, "cliproxyapi"]);

@Injectable()
export class VersionManagerService {
  async status() {
    const rows = await getVersionManagerStatus();
    return rows.map((row) => {
      const supervisor = getSupervisor(row.tool);
      if (!supervisor) return row;

      const live = supervisor.getStatus();
      return {
        ...row,
        status: live.state,
        pid: live.pid ?? row.pid,
        healthStatus: live.health,
        errorMessage: live.lastError ?? row.errorMessage,
      };
    });
  }

  async checkUpdate() {
    const [installedVersion, latestVersion] = await Promise.all([
      getInstalledVersion(),
      getLatestVersion(),
    ]);
    return {
      current: installedVersion,
      latest: latestVersion ?? null,
      updateAvailable:
        !!installedVersion && !!latestVersion && installedVersion !== latestVersion,
    };
  }

  install(version?: string) {
    return install(version || "latest");
  }

  async start() {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") {
      const error = new Error("CLIProxyAPI is not installed.");
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    const supervisor = await this.getOrInitSupervisor();
    const status = await supervisor.start();
    return { success: true, pid: status.pid, port: status.port };
  }

  async stop() {
    const supervisor = getSupervisor(TOOL);
    if (!supervisor) return { success: true };
    await supervisor.stop();
    return { success: true };
  }

  async restart() {
    const row = await getServiceRow(TOOL);
    if (!row || row.status === "not_installed") {
      const error = new Error("CLIProxyAPI is not installed.");
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    const supervisor = await this.getOrInitSupervisor();
    const status = await supervisor.restart();
    return { success: true, pid: status.pid, port: status.port };
  }

  isSupportedTool(tool: string): boolean {
    return SUPERVISOR_TOOLS.has(tool);
  }

  private async getOrInitSupervisor(): Promise<ServiceSupervisor> {
    const existing = getSupervisor(TOOL);
    if (existing) return existing as ServiceSupervisor;

    const port = parseInt(process.env.CLIPROXYAPI_PORT ?? String(CLIPROXY_DEFAULT_PORT), 10);
    const managementKey = await getOrCreateApiKey(TOOL);
    const supervisor = new ServiceSupervisor({
      tool: TOOL,
      port,
      spawnArgs: () => resolveSpawnArgs(port, managementKey),
      healthUrl: () => `http://127.0.0.1:${port}/healthz`,
      healthIntervalMs: 5_000,
      stopTimeoutMs: 15_000,
      logsBufferBytes: 5_242_880,
      probeBeforeSpawn: true,
    });
    registerSupervisor(supervisor);
    return supervisor;
  }
}
