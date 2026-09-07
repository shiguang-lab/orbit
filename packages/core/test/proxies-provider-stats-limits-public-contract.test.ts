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

const contracts = [
  {
    subpath: "./db/proxies",
    types: "./src/public/proxiesDb.d.ts",
    implementation: "./src/db/proxies.ts",
    keys: [
      "getProxyById",
      "hasBlockingProxyAssignment",
      "hasBlockingProxyAssignmentForProvider",
      "resolveProxyForProvider",
    ],
  },
  {
    subpath: "./catalog/openrouter-provider-stats",
    types: "./src/public/openrouterProviderStats.d.ts",
    implementation: "./src/catalog/openrouterProviderStats.ts",
    keys: ["getOpenRouterProviderStats", "refreshOpenRouterProviderStats"],
  },
  {
    subpath: "./catalog/openrouter-provider-stats-lifecycle",
    types: "./src/public/openrouterProviderStatsLifecycle.d.ts",
    implementation: "./src/catalog/openrouterProviderStatsLifecycle.ts",
    keys: ["initOpenRouterProviderStatsSync", "stopOpenRouterProviderStatsSync"],
  },
  {
    subpath: "./db/provider-limits-cache",
    types: "./src/public/providerLimitsCacheDb.d.ts",
    implementation: "./src/db/providerLimitsCache.ts",
    keys: [
      "getAllProviderLimitsCache",
      "getProviderLimitsCache",
      "setProviderLimitsCache",
      "setProviderLimitsCacheBatch",
    ],
  },
] as const;
const retiredAliases = [
  "./runtime/proxies",
  "./control/openrouter-provider-stats",
  "./worker/openrouter-provider-stats",
  "./usage/provider-limits-support/providerLimits",
] as const;

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

test("proxy, provider stats, and provider limits contracts expose consumed runtime keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.implementation });
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const names = [...declaration.matchAll(/export (?:const|function|class) (\w+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(names.sort(), [...contract.keys].sort(), contract.subpath);
  }
});

test("scenario aliases stay retired and stats lifecycle remains worker-only", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  const retiredImportPattern = new RegExp(
    `core/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }

  const lifecycleImport =
    "@orbit/core/catalog/openrouter-provider-stats-lifecycle";
  for (const root of [
    "apps/control",
    "apps/gateway",
    "apps/realtime",
    "packages/inference",
  ]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.equal(fs.readFileSync(file, "utf8").includes(lifecycleImport), false, file);
    }
  }
  const workerConsumers = sourceFiles(path.join(repoRoot, "apps/worker")).filter((file) =>
    fs.readFileSync(file, "utf8").includes(lifecycleImport),
  );
  assert.deepEqual(workerConsumers.map((file) => path.relative(repoRoot, file)).sort(), [
    "apps/worker/src/jobs/registry.ts",
    "apps/worker/test/openrouter-provider-stats-lifecycle.test.ts",
  ]);
});
