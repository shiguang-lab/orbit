import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("edge owns and closes the request runtime hot-reload handle", () => {
  const service = read("apps/edge-gateway/src/runtime/edge-runtime.service.ts");
  const runtime = read("packages/core/src/shared/requestRuntime.ts");
  const hotReload = read("packages/core/src/lib/config/hotReload.ts");

  assert.match(service, /implements OnModuleInit, OnModuleDestroy/);
  assert.match(service, /this\.requestRuntime = runtime/);
  assert.match(service, /this\.requestRuntime\?\.close\(\)/);
  assert.match(runtime, /return \{ close: stopRuntimeConfigHotReload \}/);
  assert.match(hotReload, /export function stopRuntimeConfigHotReload\(\)/);
  assert.doesNotMatch(hotReload, /stopRuntimeConfigHotReloadForTests/);
});
