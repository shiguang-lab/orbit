import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

const contracts = {
  "./db/database-settings": {
    entry: "./src/db/databaseSettings.ts",
    types: "./src/public/databaseSettingsDb.d.ts",
    runtime: ["getDatabaseSettings", "getUserDatabaseSettings", "updateDatabaseSettings"],
  },
  "./db/lkgp": {
    entry: "./src/db/lkgp.ts",
    types: "./src/public/lkgpDb.d.ts",
    runtime: ["clearLKGP", "getLKGP", "setLKGP"],
  },
  "./db/model-combo-mappings": {
    entry: "./src/db/modelComboMappings.ts",
    types: "./src/public/modelComboMappingsDb.d.ts",
    runtime: [
      "createModelComboMapping",
      "deleteModelComboMapping",
      "getModelComboMappingById",
      "getModelComboMappings",
      "resolveComboForModel",
      "updateModelComboMapping",
    ],
  },
  "./db/oneproxy": {
    entry: "./src/db/oneproxy.ts",
    types: "./src/public/oneproxyDb.d.ts",
    runtime: ["listOneproxyProxies"],
  },
  "./db/proxy-registry": {
    entry: "./src/db/proxyRegistry.ts",
    types: "./src/public/proxyRegistryDb.d.ts",
    runtime: [
      "addProxyToScopePool",
      "assignProxyToScope",
      "bulkAssignProxyToScope",
      "createProxy",
      "createProxyAndAssign",
      "deleteProxyById",
      "extractRelayAuth",
      "getProxyAssignments",
      "getProxyHealthStats",
      "getScopeProxyPool",
      "getScopeRotationStrategy",
      "isRelayAuthMissing",
      "isRelayProxyType",
      "listProxies",
      "migrateLegacyProxyConfigToRegistry",
      "redactProxySecrets",
      "relayRepairMode",
      "removeProxyFromScopePool",
      "resolveProxyForScopeFromRegistry",
      "setScopeRotationStrategy",
      "updateProxy",
      "updateProxyAndAssign",
      "upsertProxy",
    ],
  },
  "./db/proxy-settings": {
    entry: "./src/db/proxySettings.ts",
    types: "./src/public/proxySettingsDb.d.ts",
    runtime: ["deleteProxyForLevel", "getProxyConfig", "getProxyForLevel", "setProxyConfig"],
  },
  "./db/relay-probe-stats": {
    entry: "./src/db/relayProbeStats.ts",
    types: "./src/public/relayProbeStatsDb.d.ts",
    runtime: ["getRelayProbeStats", "recordRelayProbe"],
  },
  "./db/token-limits": {
    entry: "./src/db/tokenLimits.ts",
    types: "./src/public/tokenLimitsDb.d.ts",
    runtime: [
      "getTokenLimitsForRequest",
      "getWindowUsage",
      "incrementWindowTokens",
      "logTokenLimitReset",
      "resetWindowIfElapsed",
    ],
  },
  "./db/webhooks": {
    entry: "./src/db/webhooks.ts",
    types: "./src/public/webhooksDb.d.ts",
    runtime: [
      "createWebhook",
      "deleteWebhook",
      "getDeliveries",
      "getWebhook",
      "getWebhooks",
      "recordWebhookDelivery",
      "updateWebhookRecord",
    ],
  },
} as const;

const retiredSubpaths = ["./edge/local-db", "./db/local-db", "./control/database-settings"] as const;

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(target));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("local database capabilities use domain-specific narrow contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: contract.types,
      import: contract.entry,
    });
    assert.equal(fs.existsSync(path.join(packageRoot, contract.types)), true, `${subpath} types`);
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtime].sort(), `${subpath} runtime`);
  }
});

test("localDb aggregate exports and declarations stay retired", () => {
  for (const subpath of retiredSubpaths) assert.equal(manifest.exports[subpath], undefined, subpath);
  for (const declaration of ["localDb.d.ts", "databaseSettings.d.ts"]) {
    assert.equal(fs.existsSync(path.join(packageRoot, "src/public", declaration)), false, declaration);
  }

  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredSubpaths
      .map((subpath) => subpath.slice(2).replaceAll("/", "\\/"))
      .join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
