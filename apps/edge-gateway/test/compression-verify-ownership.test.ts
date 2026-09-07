import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { edgeRuntimeCommandSchema } from "@orbit/contracts/edge-runtime-command";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("compression fidelity execution is owned by edge behind a narrow command", () => {
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "compression.verify",
    items: [{ id: "case-1", original: "before", compressed: "after" }],
    provider: "openai",
    judgeModel: "gpt-5",
    costCapUsd: 0.1,
  }).success, true);

  const control = read("apps/control-api/src/compression/compression-verify.legacy.ts");
  const edge = read("apps/edge-gateway/src/runtime-control/compression-verify.ts");
  assert.match(control, /executeEdgeRuntimeCommand/);
  assert.doesNotMatch(control, /getExecutor|getProviderCredentials/);
  assert.match(edge, /getExecutor/);
  assert.match(edge, /getProviderCredentials/);
  assert.equal(
    existsSync(resolve(repoRoot, "apps/control-api/src/compression/judge-model-client.ts")),
    false,
  );
});
