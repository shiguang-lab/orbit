import {
  getSupervisor,
  registerSupervisor,
  ServiceSupervisor,
} from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { getOrCreateApiKey } from "@shiguang-gateway/core-domain/embedded-services/api-key";
import {
  CLIPROXY_DEFAULT_PORT,
  resolveCliproxySpawnArgs as resolveSpawnArgs,
} from "@shiguang-gateway/core-domain/control/embedded-services-install";

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
