import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { edgeRuntimeCommandSchema } from "@shiguang-gateway/contracts/edge-runtime-command";
import { GATEWAY_ENTITIES, TABLE_OWNERSHIP } from "@shiguang-gateway/db-schema";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("memory decay is a versioned edge runtime command", () => {
  assert.equal(edgeRuntimeCommandSchema.safeParse({ version: 1, command: "memory.decay" }).success, true);
  assert.equal(edgeRuntimeCommandSchema.safeParse({ version: 1, command: "memory.retention-cleanup" }).success, true);
  assert.equal(edgeRuntimeCommandSchema.safeParse({ version: 2, command: "memory.decay" }).success, false);
  assert.match(read("apps/edge-gateway/src/runtime-control/runtime-control.service.ts"), /case "memory\.decay"/);
});

test("memories have one declared writer and worker reaches it over the authenticated command", () => {
  assert.equal(GATEWAY_ENTITIES.memories.owner, "edge-gateway");
  assert.equal(TABLE_OWNERSHIP.find(({ table }) => table === "memories")?.owner, "edge-gateway");

  const registry = read("apps/worker/src/jobs/registry.ts");
  const worker = read("apps/worker/src/jobs/memory-decay.ts");
  const mcpTools = read("packages/open-sse/mcp-server/tools/memoryTools.ts");
  const manifest = JSON.parse(read("packages/core-domain/package.json")) as { exports: Record<string, unknown> };
  assert.match(registry, /import\("\.\/memory-decay\.js"\)/);
  assert.doesNotMatch(registry, /worker\/typed-memory-decay/);
  assert.match(worker, /command: "memory\.decay"/);
  assert.match(worker, /getInternalServiceAuthHeaders/);
  assert.doesNotMatch(worker, /core-domain\/(?:edge\/memory-decay|worker\/typed-memory-decay)/);
  assert.doesNotMatch(mcpTools, /services\/memoryRuntime|\b(?:createMemory|deleteMemory|updateMemory|listMemories)\b/);
  assert.match(mcpTools, /command: "memory\.(?:create|search|clear)"/);
  assert.match(mcpTools, /getInternalServiceAuthHeaders/);
  assert.equal(manifest.exports["./worker/typed-memory-decay"], undefined);
  assert.ok(manifest.exports["./edge/memory-decay"]);
});
