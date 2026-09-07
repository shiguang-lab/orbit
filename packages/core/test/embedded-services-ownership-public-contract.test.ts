import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string } | string>;
};

const contracts = {
  "./embedded-services/catalog": {
    entry: "./src/embeddedServices/catalog.ts",
    types: "./src/public/embeddedServiceCatalog.d.ts",
    keys: ["getServiceModels", "isServiceBackendPluginId"],
  },
  "./embedded-services/api-key": {
    entry: "./src/embeddedServices/apiKey.ts",
    types: "./src/public/embeddedServiceApiKey.d.ts",
    keys: ["ServiceApiKeyDecryptError", "generateServiceApiKey", "getOrCreateApiKey", "maskApiKey"],
  },
  "./embedded-services/status": {
    entry: "./src/embeddedServices/status.ts",
    types: "./src/public/embeddedServiceStatus.d.ts",
    keys: ["getServiceRow", "getVersionManagerStatus"],
  },
  "./embedded-services/liveness": {
    entry: "./src/embeddedServices/liveness.ts",
    types: "./src/public/embeddedServiceLiveness.d.ts",
    keys: ["probeEmbeddedServiceLiveness"],
  },
  "./control/embedded-services-lifecycle": {
    entry: "./src/control/embedded-services-lifecycle.ts",
    types: "./src/public/embeddedServiceLifecycle.d.ts",
    keys: [
      "ServiceSupervisor", "getServiceProviderPlugin", "getServiceRow",
      "getSettings", "getSupervisor", "getVersionManagerStatus", "getVersionManagerTool",
      "markAllUnavailable", "registerSupervisor", "saveServiceModels", "stopAllSupervisors",
      "unregisterSupervisor", "updateServiceField", "updateVersionManagerTool",
    ],
  },
  "./control/embedded-services-install": {
    entry: "./src/control/embedded-services-install.ts",
    types: "./src/public/embeddedServiceInstall.d.ts",
    keys: [
      "BIFROST_DEFAULT_PORT", "CLIPROXY_DEFAULT_PORT", "DARIO_DEFAULT_PORT", "InstallError",
      "MUX_DEFAULT_PORT", "SERVICE_VERSION_PATTERN", "getBifrostInstalledVersion",
      "getBifrostLatestVersion", "getCliproxyInstalledVersion", "getCliproxyLatestVersion",
      "getNineRouterInstalledVersion", "getNineRouterLatestVersion", "installBifrost",
      "installCliproxy", "installNineRouter", "resolveBifrostSpawnArgs", "resolveCliproxySpawnArgs",
      "resolveDarioSpawnArgs", "resolveMuxSpawnArgs", "resolveNineRouterSpawnArgs", "updateBifrost",
      "updateNineRouter",
    ],
  },
} as const;

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("embedded-service public contracts expose exact runtime and declaration keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], { types: contract.types, import: contract.entry });
    assert.equal(fs.existsSync(path.join(packageRoot, contract.types)), true);
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
  }
});

test("wide and cross-process supervisor aliases stay retired", () => {
  for (const subpath of [
    "./shared/version-manager", "./shared/embedded-services",
    "./control/embedded-services-runtime-support", "./edge/service-registry",
  ]) assert.equal(manifest.exports[subpath], undefined, subpath);
  for (const file of ["versionManagerControl.d.ts", "embeddedServices.d.ts", "serviceRegistry.d.ts"]) {
    assert.equal(fs.existsSync(path.join(packageRoot, "src/public", file)), false, file);
  }
});

test("supervisor and installer contracts are control-only", () => {
  const forbidden = /core\/control\/embedded-services-(?:lifecycle|install)/;
  for (const root of ["apps/gateway", "apps/worker", "apps/realtime", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbidden, file);
    }
  }
  const streamingExecutor = fs.readFileSync(path.join(repoRoot, "packages/inference/src/executors/ninerouter.ts"), "utf8");
  assert.doesNotMatch(streamingExecutor, /getSupervisor/);
  assert.match(streamingExecutor, /probeEmbeddedServiceLiveness/);
});
