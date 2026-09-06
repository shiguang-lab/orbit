import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_INTERVAL_MS = 5000;

function resolveDataDir() {
  const configured = process.env.DATA_DIR;
  return typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : join(homedir(), ".shiguangGateway");
}

export function startMcpHeartbeat(config) {
  const startedAt = new Date().toISOString();
  const heartbeatPath = join(resolveDataDir(), "runtime", "mcp-heartbeat.json");
  const intervalMs =
    typeof config.intervalMs === "number" && config.intervalMs > 0
      ? config.intervalMs
      : DEFAULT_INTERVAL_MS;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const snapshot = {
      pid: process.pid,
      startedAt,
      lastHeartbeatAt: new Date().toISOString(),
      version: config.version,
      transport: "stdio",
      scopesEnforced: config.scopesEnforced,
      allowedScopes: [...config.allowedScopes],
      toolCount: config.toolCount,
    };
    try {
      await fs.mkdir(dirname(heartbeatPath), { recursive: true });
      await fs.writeFile(heartbeatPath, JSON.stringify(snapshot, null, 2), "utf-8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[MCP Heartbeat] Failed to write heartbeat:", message);
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
  };
}
