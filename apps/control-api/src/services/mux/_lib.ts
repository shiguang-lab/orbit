import {
  MUX_DEFAULT_PORT,
  getOrCreateApiKey,
  getSupervisor,
  registerSupervisor,
  resolveMuxSpawnArgs,
  ServiceSupervisor,
} from "@orbit/core/control/mux";

const TOOL = "mux";
const PORT = Number.parseInt(process.env.MUX_SERVICE_PORT ?? String(MUX_DEFAULT_PORT), 10);

export async function getOrInitSupervisor(): Promise<InstanceType<typeof ServiceSupervisor>> {
  const existing = getSupervisor(TOOL);
  if (existing) return existing as InstanceType<typeof ServiceSupervisor>;
  const apiKey = await getOrCreateApiKey(TOOL);
  const supervisor = new ServiceSupervisor({
    tool: TOOL,
    port: PORT,
    spawnArgs: () => resolveMuxSpawnArgs(apiKey, PORT),
    healthUrl: () => `http://127.0.0.1:${PORT}/health`,
    healthIntervalMs: 5_000,
    stopTimeoutMs: 15_000,
    logsBufferBytes: 5_242_880,
    probeBeforeSpawn: true,
  });
  registerSupervisor(supervisor);
  return supervisor;
}
