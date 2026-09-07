import type { EdgeRuntimeCommand } from "@shiguang-gateway/contracts/edge-runtime-command";
import { getInternalServiceAuthHeaders } from "@shiguang-gateway/auth/internal-service";

type ExecuteDecay = () => Promise<unknown>;

let decayTimer: ReturnType<typeof setInterval> | null = null;

function edgeGatewayBaseUrl(): string {
  const configured = process.env.EDGE_GATEWAY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1").trim();
  const reachableHost = host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;
  return `http://${reachableHost}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
}

export async function executeMemoryDecay(
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  return executeMemoryCommand({ version: 1, command: "memory.decay" }, fetchImpl);
}

export async function executeMemoryRetentionCleanup(
  fetchImpl: typeof fetch = fetch,
): Promise<{ deleted: number; errors: number }> {
  return executeMemoryCommand(
    { version: 1, command: "memory.retention-cleanup" },
    fetchImpl,
  ) as Promise<{ deleted: number; errors: number }>;
}

async function executeMemoryCommand(
  command: EdgeRuntimeCommand,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const response = await fetchImpl(`${edgeGatewayBaseUrl()}/api/internal/runtime/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getInternalServiceAuthHeaders() },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Edge memory decay command failed (${response.status})`);
  return response.json();
}

function resolveIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const seconds = Number(env.MEMORY_TYPED_DECAY_SWEEP_INTERVAL);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds * 1000) : 0;
}

/** Worker owns cadence; the authenticated edge command owns every memory write. */
export function startMemoryDecayScheduler(options: {
  enabled?: boolean;
  intervalMs?: number;
  execute?: ExecuteDecay;
} = {}): void {
  if (decayTimer) return;
  const enabled = options.enabled ?? process.env.MEMORY_TYPED_DECAY_ENABLED === "true";
  const intervalMs = options.intervalMs ?? resolveIntervalMs();
  if (!enabled || intervalMs <= 0) return;

  const execute = options.execute ?? executeMemoryDecay;
  const tick = () => void execute().catch((error: unknown) => {
    console.warn("[worker] memory decay command failed:", error instanceof Error ? error.message : String(error));
  });
  tick();
  decayTimer = setInterval(tick, intervalMs);
  decayTimer.unref?.();
}

export function stopMemoryDecayScheduler(): void {
  if (!decayTimer) return;
  clearInterval(decayTimer);
  decayTimer = null;
}
