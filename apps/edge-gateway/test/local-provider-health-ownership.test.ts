import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { isLocalProviderUrl } from "../src/runtime-control/local-provider-health.service.js";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("local provider URL detection covers loopback and RFC1918 networks", () => {
  for (const url of [
    "http://localhost:11434/v1",
    "http://127.0.0.1:11434/v1",
    "http://[::1]:11434/v1",
    "http://10.0.2.15/v1",
    "http://172.16.0.4/v1",
    "http://172.31.255.4/v1",
    "http://192.168.1.20/v1",
  ]) assert.equal(isLocalProviderUrl(url), true, url);

  for (const url of [
    "https://api.openai.com/v1",
    "http://172.15.0.4/v1",
    "http://172.32.0.4/v1",
    "http://user:secret@127.0.0.1/v1",
    "not-a-url",
  ]) assert.equal(isLocalProviderUrl(url), false, url);
});

test("edge exclusively owns local provider polling lifecycle", () => {
  const edgeService = read("apps/edge-gateway/src/runtime-control/local-provider-health.service.ts");
  const edgeModule = read("apps/edge-gateway/src/runtime-control/runtime-control.module.ts");
  const edgeCommands = read("apps/edge-gateway/src/runtime-control/runtime-control.service.ts");
  const controlMonitoring = read("apps/control-api/src/monitoring/monitoring-health.service.ts");

  assert.equal(existsSync(resolve(repoRoot, "apps/control-api/src/monitoring/local-provider-health.service.ts")), false);
  assert.match(edgeService, /implements OnModuleInit, OnModuleDestroy/);
  assert.match(edgeService, /getCachedProviderNodes/);
  assert.match(edgeModule, /providers:\s*\[RuntimeControlService, LocalProviderHealthService\]/);
  assert.match(edgeCommands, /localProviders: localProviderHealth\.getAllHealthStatuses\(\)/);
  assert.match(controlMonitoring, /localProviders: runtime\.localProviders/);
  assert.doesNotMatch(controlMonitoring, /setTimeout|setInterval|getCachedProviderNodes|LocalProviderHealthService/);
});
