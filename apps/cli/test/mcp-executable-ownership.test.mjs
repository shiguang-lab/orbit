import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

import { CLI_APP_ROOT } from "../src/cli/app-paths.mjs";
import { startMcpCli } from "../src/mcp-server.mjs";

const repoRoot = dirname(dirname(CLI_APP_ROOT));
const openSseRoot = join(repoRoot, "packages", "open-sse");

test("CLI owns MCP stdio composition and process lifecycle", async () => {
  const processLike = new EventEmitter();
  let connected = 0;
  let stopped = 0;
  let closed = 0;
  let heartbeatConfig;
  const runtime = {
    createMcpServer: () => ({ connect: async () => { connected += 1; } }),
    createTransport: () => ({ kind: "stdio" }),
    getMcpServerRuntimeInfo: () => ({
      version: "test",
      scopesEnforced: true,
      allowedScopes: ["read"],
      toolCount: 7,
    }),
    startHeartbeat: (config) => {
      heartbeatConfig = config;
      return () => { stopped += 1; };
    },
    closeAuditDb: () => { closed += 1; return true; },
  };

  await startMcpCli({ runtime, processLike, logger: { error() {} } });
  assert.equal(connected, 1);
  assert.equal(stopped, 1);
  assert.equal(closed, 1);
  assert.deepEqual(heartbeatConfig, runtime.getMcpServerRuntimeInfo());
  assert.equal(processLike.listenerCount("SIGINT"), 0);
  assert.equal(processLike.listenerCount("SIGTERM"), 0);
  assert.equal(processLike.listenerCount("exit"), 0);
});

test("open-sse publishes only a narrow callable MCP factory", () => {
  const manifest = JSON.parse(readFileSync(join(openSseRoot, "package.json"), "utf8"));
  assert.equal(manifest.exports["./mcp-server/entry"], undefined);
  assert.deepEqual(manifest.exports["./mcp-server/factory"], {
    types: "./public/mcpServerFactory.d.ts",
    import: "./mcp-server/factory.ts",
  });
  const factory = readFileSync(join(openSseRoot, "mcp-server", "factory.ts"), "utf8");
  assert.doesNotMatch(factory, /startMcpStdio|process\.|StdioServerTransport|startMcpHeartbeat/);

  const server = readFileSync(join(openSseRoot, "mcp-server", "server.ts"), "utf8");
  assert.doesNotMatch(server, /startMcpStdio|StdioServerTransport|startMcpHeartbeat|process\.(?:once|on)\(/);
  assert.doesNotMatch(server, /process\.argv\[1\]/);
  const heartbeat = readFileSync(join(openSseRoot, "mcp-server", "runtimeHeartbeat.ts"), "utf8");
  assert.doesNotMatch(heartbeat, /startMcpHeartbeat|setInterval\(/);
});
