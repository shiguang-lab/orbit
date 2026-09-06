import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readSourceTree = (relativeDir: string): string => {
  const root = path.join(repoRoot, relativeDir);
  return fs.readdirSync(root, { withFileTypes: true }).map((entry) => {
    const relativeEntry = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return readSourceTree(relativeEntry);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? read(relativeEntry) : "";
  }).join("\n");
};

test("control API does not claim ownership of whole-gateway lifecycle", () => {
  const controller = read("apps/control-api/src/gateway/gateway.controller.ts");
  const service = read("apps/control-api/src/gateway/gateway.service.ts");

  assert.doesNotMatch(controller, /@Post\(["'](?:restart|shutdown)["']\)/);
  assert.doesNotMatch(controller, /schedule(?:Restart|Shutdown)/);
  assert.doesNotMatch(service, /process\.(?:kill|exit)\s*\(/);
  assert.doesNotMatch(service, /schedule(?:Restart|Shutdown)/);
});

test("public API contracts keep the retired lifecycle routes absent", () => {
  const openApi = read("packages/core-domain/docs/openapi.yaml");
  const generatedSystemCommands = read("apps/cli/src/cli/api-commands/system.mjs");
  const adminSource = readSourceTree("apps/admin/src");

  for (const route of ["/api/restart", "/api/shutdown"]) {
    assert.equal(openApi.includes(`  ${route}:`), false, route);
    assert.equal(generatedSystemCommands.includes(`let url = "${route}"`), false, route);
    assert.equal(adminSource.includes(route), false, `admin consumer: ${route}`);
  }
});

test("external CLI owns all split-service stop and restart operations", () => {
  const lifecycle = read("apps/cli/src/cli/runtime/splitLifecycle.mjs");
  const stopCommand = read("apps/cli/src/cli/commands/stop.mjs");
  const restartCommand = read("apps/cli/src/cli/commands/restart.mjs");

  assert.match(lifecycle, /SPLIT_SERVICE_NAMES\s*=\s*\["edge-gateway",\s*"control-api",\s*"realtime",\s*"worker"\]/);
  assert.match(lifecycle, /for \(const name of \[\.\.\.SPLIT_SERVICE_NAMES\]\.reverse\(\)\)/);
  assert.match(stopCommand, /await stopSplitServices\(deps\)/);
  assert.match(restartCommand, /await runStopCommand\(opts, deps\)/);
  assert.match(restartCommand, /await \(deps\.runServe \?\? runServe\)\(opts, deps\)/);
});
