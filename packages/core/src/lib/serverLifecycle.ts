export type ServerLifecyclePhase = "starting" | "ready" | "stopping";

declare global {
  var __orbitServerLifecycle: ServerLifecyclePhase | undefined;
}

export function getServerLifecyclePhase(): ServerLifecyclePhase {
  return globalThis.__orbitServerLifecycle ?? "starting";
}

export function markServerStarting(): void {
  globalThis.__orbitServerLifecycle = "starting";
}

export function markServerReady(): void {
  if (getServerLifecyclePhase() !== "stopping") {
    globalThis.__orbitServerLifecycle = "ready";
  }
}

export function markServerStopping(): void {
  globalThis.__orbitServerLifecycle = "stopping";
}
