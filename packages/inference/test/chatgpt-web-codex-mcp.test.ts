import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

import {
  resolveChatGptWebCodexMcpEntry,
} from "@orbit/inference/executors/chatgpt-web-codex/mcp-command";
import {
  buildChatGptWebCodexMcpCommand,
  resolveChatGptWebCodexMcpCommandEntry,
} from "../src/executors/chatgpt-web-codex/tunnelClient.ts";

const commandModuleUrl = new URL("../src/executors/chatgpt-web-codex/mcpCommand.ts", import.meta.url).href;

test("resolves the package-owned MCP implementation without using cwd", () => {
  const entry = resolveChatGptWebCodexMcpEntry(commandModuleUrl);
  assert.ok(entry);
  assert.equal(existsSync(entry), true);
  assert.match(entry, /packages\/inference\/src\/vendor\/codex-chatgpt-web\/.*\/mcp-server\.ts$/);
});

test("builds a source command with the tsx loader and absolute package-owned entry", () => {
  const tunnelModuleUrl = new URL("../src/executors/chatgpt-web-codex/tunnelClient.ts", import.meta.url).href;
  const entry = resolveChatGptWebCodexMcpCommandEntry(tunnelModuleUrl);
  assert.ok(entry);
  const command = buildChatGptWebCodexMcpCommand("/tmp/broker socket.sock", {
    moduleUrl: tunnelModuleUrl,
    nodeExecutable: "/runtime/node",
    tsxImport: "file:///runtime/node_modules/tsx/dist/loader.mjs",
  });
  assert.equal(
    command,
    `${JSON.stringify("/runtime/node")} ${JSON.stringify("--import")} ${JSON.stringify("file:///runtime/node_modules/tsx/dist/loader.mjs")} ${JSON.stringify(entry)} ${JSON.stringify("--broker-socket")} ${JSON.stringify("/tmp/broker socket.sock")}`
  );
  assert.doesNotMatch(command, /process\.cwd|\/bin\/chatgpt-web-codex-mcp/);
});

test("the command entry runs from an unrelated cwd and validates its contract", () => {
  const entry = fileURLToPath(commandModuleUrl);
  const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), entry], {
    cwd: dirname(process.execPath),
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--broker-socket is required/);
});

test("prefers a compiled command beside a compiled tunnel client", () => {
  const compiledUrl = pathToFileURL("/release/open-sse/dist/executors/chatgpt-web-codex/tunnelClient.js").href;
  const expected = "/release/open-sse/dist/executors/chatgpt-web-codex/mcpCommand.js";
  assert.equal(resolveChatGptWebCodexMcpCommandEntry(compiledUrl, (path) => path === expected), expected);
});
