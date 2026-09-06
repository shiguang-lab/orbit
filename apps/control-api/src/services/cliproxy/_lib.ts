import {
  CLIPROXY_DEFAULT_PORT,
  getOrCreateApiKey,
  getSupervisor,
  registerSupervisor,
  resolveSpawnArgs,
  ServiceSupervisor,
} from "@shiguang-gateway/core-domain/shared/version-manager";

const TOOL = "cliproxy";
const PORT = Number.parseInt(process.env.CLIPROXYAPI_PORT ?? String(CLIPROXY_DEFAULT_PORT), 10);

export async function getOrInitSupervisor(): Promise<InstanceType<typeof ServiceSupervisor>> {
  const existing = getSupervisor(TOOL);
  if (existing) return existing as InstanceType<typeof ServiceSupervisor>;
  const managementKey = await getOrCreateApiKey(TOOL);
  const supervisor = new ServiceSupervisor({
    tool: TOOL,
    port: PORT,
    spawnArgs: () => resolveSpawnArgs(PORT, managementKey),
    healthUrl: () => `http://127.0.0.1:${PORT}/healthz`,
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    probeBeforeSpawn: true,
  });
  registerSupervisor(supervisor);
  return supervisor;
}
