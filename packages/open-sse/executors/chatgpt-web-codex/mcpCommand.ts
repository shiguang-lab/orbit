#!/usr/bin/env node

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export function resolveChatGptWebCodexMcpEntry(
  moduleUrl: string = import.meta.url,
  exists: (path: string) => boolean = existsSync
): string | null {
  const candidates = [
    fileURLToPath(new URL("../../vendor/codex-chatgpt-web/adapters/chatgpt-web/mcp-server.js", moduleUrl)),
    fileURLToPath(new URL("../../vendor/codex-chatgpt-web/adapters/chatgpt-web/mcp-server.ts", moduleUrl)),
  ];
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

export async function startChatGptWebCodexMcp(
  args: string[] = process.argv.slice(2),
  moduleUrl: string = import.meta.url
): Promise<void> {
  const socketIndex = args.indexOf("--broker-socket");
  const brokerSocketPath = socketIndex >= 0 ? args[socketIndex + 1] : undefined;
  if (!brokerSocketPath) throw new Error("--broker-socket is required");

  const entry = resolveChatGptWebCodexMcpEntry(moduleUrl);
  if (!entry) throw new Error("ChatGPT Web (Codex) MCP entrypoint was not found");

  const module = (await import(pathToFileURL(entry).href)) as {
    runChatGptMcpServer(options: { brokerSocketPath: string }): Promise<void>;
  };
  await module.runChatGptMcpServer({ brokerSocketPath });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startChatGptWebCodexMcp().catch((error) => {
    console.error(`ChatGPT Web (Codex) MCP failed to start: ${error?.message || error}`);
    process.exit(1);
  });
}
