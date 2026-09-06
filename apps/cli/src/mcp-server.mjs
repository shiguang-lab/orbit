#!/usr/bin/env node

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { startMcpHeartbeat } from "./mcpRuntimeHeartbeat.mjs";

const currentFile = fileURLToPath(import.meta.url);

async function loadMcpRuntime() {
  await import(new URL("./mcpStdioConsoleGuard.mjs", import.meta.url).href);
  const { installRuntimePorts } = await import(
    "@shiguang-gateway/open-sse/services/dbRuntimeHooks"
  );
  installRuntimePorts();
  const [{ createMcpServer, getMcpServerRuntimeInfo }, { closeAuditDb }, { StdioServerTransport }] =
    await Promise.all([
      import("@shiguang-gateway/open-sse/mcp-server/factory"),
      import("@shiguang-gateway/open-sse/mcp-server/audit"),
      import("@modelcontextprotocol/sdk/server/stdio.js"),
    ]);
  return {
    createMcpServer,
    getMcpServerRuntimeInfo,
    closeAuditDb,
    createTransport: () => new StdioServerTransport(),
    startHeartbeat: startMcpHeartbeat,
  };
}

export async function startMcpCli(options = {}) {
  const processLike = options.processLike || process;
  processLike.chdir?.(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
  const runtime = options.runtime || (await loadMcpRuntime());
  const logger = options.logger || console;
  const server = await runtime.createMcpServer();
  const transport = runtime.createTransport();
  const stopHeartbeat = runtime.startHeartbeat(await runtime.getMcpServerRuntimeInfo());
  const stopHeartbeatOnce = () => stopHeartbeat();

  processLike.once("exit", stopHeartbeatOnce);
  processLike.once("SIGINT", stopHeartbeatOnce);
  processLike.once("SIGTERM", stopHeartbeatOnce);
  logger.error("[MCP] ShiguangGateway MCP Server starting (stdio transport)...");
  try {
    await server.connect(transport);
    logger.error("[MCP] ShiguangGateway MCP Server connected and ready.");
  } finally {
    if (runtime.closeAuditDb()) {
      logger.error("[MCP] Audit database checkpointed and closed.");
    }
    stopHeartbeatOnce();
    processLike.off("exit", stopHeartbeatOnce);
    processLike.off("SIGINT", stopHeartbeatOnce);
    processLike.off("SIGTERM", stopHeartbeatOnce);
  }
}

if (process.argv[1] && currentFile === process.argv[1]) {
  startMcpCli().catch((error) => {
    console.error("\x1b[31m✖ Failed to start MCP server:\x1b[0m", error?.message || error);
    process.exitCode = 1;
  });
}
