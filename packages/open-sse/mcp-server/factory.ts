import type { CreateMcpServerOptions } from "./server.ts";

export async function createMcpServer(options?: CreateMcpServerOptions) {
  return (await import("./server.ts")).createMcpServer(options);
}

export async function getMcpServerRuntimeInfo() {
  return (await import("./server.ts")).getMcpServerRuntimeInfo();
}
