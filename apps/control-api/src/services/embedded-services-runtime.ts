import {
  getVersionManagerTool,
  getSettings,
  markAllUnavailable,
  registerSupervisor,
  getSupervisor,
  ServiceSupervisor,
  type ServiceStatus,
  getServiceProviderPlugin,
} from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { getOrCreateApiKey } from "@shiguang-gateway/core-domain/embedded-services/api-key";
import {
  resolveNineRouterSpawnArgs as nineRouterSpawnArgs,
  resolveCliproxySpawnArgs as cliproxySpawnArgs,
  CLIPROXY_DEFAULT_PORT,
  resolveMuxSpawnArgs as muxSpawnArgs,
  MUX_DEFAULT_PORT,
  resolveBifrostSpawnArgs as bifrostSpawnArgs,
  BIFROST_DEFAULT_PORT,
  resolveDarioSpawnArgs as darioSpawnArgs,
  DARIO_DEFAULT_PORT,
} from "@shiguang-gateway/core-domain/control/embedded-services-install";
import { resolveDedicatedCliproxyapiApiKey } from "@shiguang-gateway/open-sse/handlers/chat-core/cliproxyapi-credentials";
import {
  scheduleServiceModelSync,
  stopServiceModelSync,
} from "./embedded-service-model-sync.js";

// 9router's port/health/lifecycle config is sourced from the plugin registry (#7333
// Phase 1) rather than an inline literal — the plugin object below must resolve to the
// exact same values the pre-migration literal expressed here.
const NINEROUTER_PLUGIN = getServiceProviderPlugin("9router");
if (!NINEROUTER_PLUGIN) {
  // Must never silently vanish from bootstrap — a missing plugin here means the
  // registry (src/lib/services/providerPlugins/registry.ts) regressed.
  throw new Error("[Services] Missing ServiceProviderPlugin registration for '9router'");
}
const NINEROUTER_PORT = parseInt(
  process.env[NINEROUTER_PLUGIN.port.envVar] ?? String(NINEROUTER_PLUGIN.port.default),
  10
);
const CLIPROXY_PORT = parseInt(process.env.CLIPROXYAPI_PORT ?? String(CLIPROXY_DEFAULT_PORT), 10);
const MUX_PORT = parseInt(process.env.MUX_SERVICE_PORT ?? String(MUX_DEFAULT_PORT), 10);
const BIFROST_PORT = parseInt(process.env.BIFROST_PORT ?? String(BIFROST_DEFAULT_PORT), 10);
const DARIO_PORT = parseInt(process.env.DARIO_PORT ?? String(DARIO_DEFAULT_PORT), 10);

type ServiceEntry = {
  tool: string;
  port: number;
  healthPath: string;
  healthIntervalMs: number;
  stopTimeoutMs: number;
  logsBufferBytes: number;
  needsApiKey: boolean;
};

const SERVICES: ServiceEntry[] = [
  {
    tool: NINEROUTER_PLUGIN.tool,
    port: NINEROUTER_PORT,
    healthPath: NINEROUTER_PLUGIN.healthPath,
    healthIntervalMs: NINEROUTER_PLUGIN.healthIntervalMs,
    stopTimeoutMs: NINEROUTER_PLUGIN.stopTimeoutMs,
    logsBufferBytes: NINEROUTER_PLUGIN.logsBufferBytes,
    needsApiKey: NINEROUTER_PLUGIN.needsApiKey,
  },
  {
    tool: "cliproxy",
    port: CLIPROXY_PORT,
    healthPath: "/healthz",
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    needsApiKey: true,
  },
  {
    tool: "mux",
    port: MUX_PORT,
    healthPath: "/health",
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    needsApiKey: true,
  },
  {
    tool: "bifrost",
    port: BIFROST_PORT,
    healthPath: "/v1/models",
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    needsApiKey: false,
  },
  {
    // Dario (@askalf/dario): Claude-subscription proxy, alternative/failover to
    // CLIProxyAPI for Claude-Code-shaped traffic. needsApiKey=true → the
    // generated key becomes DARIO_ADMIN_TOKEN (gates the /admin/* OAuth control
    // plane). /health is 503 "degraded" until the first Claude account is added,
    // which is the expected pre-OAuth state (waitForHealthy tolerates it).
    tool: "dario",
    port: DARIO_PORT,
    healthPath: "/health",
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    needsApiKey: true,
  },
];

function buildSpawnArgsFactory(
  cfg: ServiceEntry,
  apiKey: string
): () => ReturnType<typeof nineRouterSpawnArgs> {
  if (cfg.tool === "9router") {
    return () => nineRouterSpawnArgs(apiKey, cfg.port);
  }
  if (cfg.tool === "mux") {
    return () => muxSpawnArgs(apiKey, cfg.port);
  }
  if (cfg.tool === "bifrost") {
    return () => bifrostSpawnArgs(cfg.port);
  }
  if (cfg.tool === "dario") {
    return () => darioSpawnArgs(apiKey, cfg.port);
  }
  return () => cliproxySpawnArgs(cfg.port, apiKey);
}

export async function bootstrapEmbeddedServices(): Promise<void> {
  for (const cfg of SERVICES) {
    if (getSupervisor(cfg.tool)) continue;

    const row = await getVersionManagerTool(cfg.tool);
    if (!row || row.status === "not_installed") continue;

    let apiKey = "";
    if (cfg.needsApiKey) {
      try {
        apiKey = await getOrCreateApiKey(cfg.tool);
      } catch (error) {
        // Never start an embedded service with a fabricated credential. A
        // missing/corrupt stored key must leave the service stopped and make
        // the operator-visible error the source of truth for remediation.
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Services] Skipping ${cfg.tool}: unable to load service API key: ${message}`);
        continue;
      }
    }
    // CLIProxyAPI's generated key is management-only; /v1/models uses its dedicated data-plane key.
    const modelSyncApiKey =
      cfg.tool === "cliproxy"
        ? (resolveDedicatedCliproxyapiApiKey(await getSettings()) ?? "")
        : apiKey;

    const supervisor = new ServiceSupervisor({
      tool: cfg.tool,
      port: cfg.port,
      spawnArgs: buildSpawnArgsFactory(cfg, apiKey),
      healthUrl: () => `http://127.0.0.1:${cfg.port}${cfg.healthPath}`,
      healthIntervalMs: cfg.healthIntervalMs,
      stopTimeoutMs: cfg.stopTimeoutMs,
      logsBufferBytes: cfg.logsBufferBytes,
      // #6205: embedded services bind a fixed port — probe before spawning so
      // an orphaned prior instance yields adopt/clear-error instead of a raw
      // EADDRINUSE crash.
      probeBeforeSpawn: true,
    });

    registerSupervisor(supervisor);

    const baseUrl = `http://127.0.0.1:${cfg.port}`;
    supervisor.on("stateChange", (status: ServiceStatus) => {
      if (status.state === "running") {
        scheduleServiceModelSync(cfg.tool, baseUrl, modelSyncApiKey);
      } else if (status.state === "stopped" || status.state === "error") {
        stopServiceModelSync(cfg.tool);
        markAllUnavailable(cfg.tool);
      }
    });

    if (row.autoStart) {
      supervisor.start().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Services] Auto-start failed for ${cfg.tool}: ${msg}`);
      });
    }
  }
}
