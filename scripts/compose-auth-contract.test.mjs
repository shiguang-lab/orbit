import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtimeServices = ["gateway", "control", "realtime", "worker"].map(name => `shiguang-gateway-${name}`);
function resolvedServices(override) {
  const env = { ...process.env, SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN: "compose-contract-test-only" };
  delete env.REQUIRE_API_KEY;
  if (override !== undefined) env.REQUIRE_API_KEY = override;
  const result = spawnSync("docker", ["compose", "--env-file", ".env.example", "config", "--format", "json"], {
    cwd: root, env, encoding: "utf8",
  });
  assert.equal(result.status, 0, "compose auth contract must resolve successfully");
  return JSON.parse(result.stdout).services;
}

test("deployment example requires API keys across all runtime services", () => {
  const services = resolvedServices();
  for (const name of runtimeServices) assert.equal(services[name].environment.REQUIRE_API_KEY, "true", name);
});

test("deployment defaults to required keys when the variable is empty", () => {
  const services = resolvedServices("");
  for (const name of runtimeServices) assert.equal(services[name].environment.REQUIRE_API_KEY, "true", name);
});

test("explicit operator policy remains configurable across all runtime services", () => {
  const services = resolvedServices("false");
  for (const name of runtimeServices) assert.equal(services[name].environment.REQUIRE_API_KEY, "false", name);
});
