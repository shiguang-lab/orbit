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

const expectedCacheExports = [
  "DEFAULT_QUOTA_THRESHOLD_PERCENT",
  "getQuotaCache",
  "getQuotaWindowStatus",
  "hydrateCodexQuotaCacheForRequest",
  "isAccountQuotaExhausted",
  "isQuotaExhaustedForRequest",
  "markAccountExhaustedFrom429",
  "setQuotaCache",
] as const;
const expectedLifecycleExports = ["startBackgroundRefresh", "stopBackgroundRefresh"] as const;
const retiredAliases = [
  "./worker/quota-cache",
  "./runtime/quota-cache",
  "./usage/provider-limits-support/quotaCache",
  "./domain/quotaCache",
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

test("quota cache data and lifecycle contracts expose disjoint runtime keys", async () => {
  const cacheEntry = manifest.exports["./quota/cache"];
  const lifecycleEntry = manifest.exports["./quota/cache-lifecycle"];
  assert.deepEqual(cacheEntry, {
    types: "./src/public/quotaCache.d.ts",
    import: "./src/quota/cache.ts",
  });
  assert.deepEqual(lifecycleEntry, {
    types: "./src/public/quotaCacheLifecycle.d.ts",
    import: "./src/quota/cacheLifecycle.ts",
  });

  const cacheRuntime = await import(
    pathToFileURL(path.join(packageRoot, (cacheEntry as { import: string }).import)).href
  );
  const lifecycleRuntime = await import(
    pathToFileURL(path.join(packageRoot, (lifecycleEntry as { import: string }).import)).href
  );
  assert.deepEqual(Object.keys(cacheRuntime).sort(), [...expectedCacheExports].sort());
  assert.deepEqual(Object.keys(lifecycleRuntime).sort(), [...expectedLifecycleExports].sort());

  const cacheDeclaration = fs.readFileSync(
    path.join(packageRoot, (cacheEntry as { types: string }).types),
    "utf8",
  );
  const declaredCacheValues = [
    ...cacheDeclaration.matchAll(/export (?:const|function) (\w+)/g),
  ].map((match) => match[1]);
  assert.deepEqual(declaredCacheValues.sort(), [...expectedCacheExports].sort());

  const lifecycleDeclaration = fs.readFileSync(
    path.join(packageRoot, (lifecycleEntry as { types: string }).types),
    "utf8",
  );
  const declaredLifecycleValues = [
    ...lifecycleDeclaration.matchAll(/export function (\w+)/g),
  ].map((match) => match[1]);
  assert.deepEqual(declaredLifecycleValues.sort(), [...expectedLifecycleExports].sort());
});

test("scenario aliases stay retired and lifecycle remains worker-only", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);

  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }

  const lifecycleImport = "@shiguang-gateway/core-domain/quota/cache-lifecycle";
  for (const root of [
    "apps/control-api",
    "apps/edge-gateway",
    "apps/realtime",
    "packages/open-sse",
  ]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.equal(fs.readFileSync(file, "utf8").includes(lifecycleImport), false, file);
    }
  }
  const workerConsumers = sourceFiles(path.join(repoRoot, "apps/worker")).filter((file) =>
    fs.readFileSync(file, "utf8").includes(lifecycleImport),
  );
  assert.deepEqual(workerConsumers.map((file) => path.relative(repoRoot, file)), [
    "apps/worker/src/jobs/registry.ts",
  ]);
});
