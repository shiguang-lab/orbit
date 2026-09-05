export type ServerLifecyclePhase = "starting" | "ready" | "stopping";

declare global {
  var __shiguangGatewayServerLifecycle: ServerLifecyclePhase | undefined;
}

export function getServerLifecyclePhase(): ServerLifecyclePhase {
  return globalThis.__shiguangGatewayServerLifecycle ?? "starting";
}

export function markServerStarting(): void {
  globalThis.__shiguangGatewayServerLifecycle = "starting";
}

export function markServerReady(): void {
  if (getServerLifecyclePhase() !== "stopping") {
    globalThis.__shiguangGatewayServerLifecycle = "ready";
  }
}

export function markServerStopping(): void {
  globalThis.__shiguangGatewayServerLifecycle = "stopping";
}
