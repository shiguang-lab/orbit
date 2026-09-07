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

const expectedStoreExports = [
  "deleteSessionAccountAffinity",
  "evictSessionAccountAffinityForConnection",
  "getSessionAccountAffinity",
  "touchSessionAccountAffinity",
  "upsertSessionAccountAffinity",
] as const;
const expectedLifecycleExports = [
  "startSessionAccountAffinityCleanup",
  "stopSessionAccountAffinityCleanupForTests",
] as const;
const retiredAliases = [
  "./db/session-account-affinity",
  "./worker/session-affinity",
  "./runtime/session-affinity-db",
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

test("session-affinity store and cleanup lifecycle expose disjoint runtime keys", async () => {
  const storeEntry = manifest.exports["./session-affinity/store"];
  const lifecycleEntry = manifest.exports["./session-affinity/cleanup-lifecycle"];
  assert.deepEqual(storeEntry, {
    types: "./src/public/sessionAffinityStore.d.ts",
    import: "./src/sessionAffinity/store.ts",
  });
  assert.deepEqual(lifecycleEntry, {
    types: "./src/public/sessionAffinityCleanupLifecycle.d.ts",
    import: "./src/sessionAffinity/cleanupLifecycle.ts",
  });

  const storeRuntime = await import(
    pathToFileURL(path.join(packageRoot, (storeEntry as { import: string }).import)).href
  );
  const lifecycleRuntime = await import(
    pathToFileURL(path.join(packageRoot, (lifecycleEntry as { import: string }).import)).href
  );
  assert.deepEqual(Object.keys(storeRuntime).sort(), [...expectedStoreExports].sort());
  assert.deepEqual(Object.keys(lifecycleRuntime).sort(), [...expectedLifecycleExports].sort());

  for (const [entry, expected] of [
    [storeEntry, expectedStoreExports],
    [lifecycleEntry, expectedLifecycleExports],
  ] as const) {
    const declaration = fs.readFileSync(
      path.join(packageRoot, (entry as { types: string }).types),
      "utf8",
    );
    const names = [...declaration.matchAll(/export function (\w+)/g)].map((match) => match[1]);
    assert.deepEqual(names.sort(), [...expected].sort());
  }
});

test("scenario aliases stay retired and cleanup lifecycle remains worker-only", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  assert.equal(
    fs.existsSync(path.join(packageRoot, "src/public/sessionAccountAffinityDb.d.ts")),
    false,
  );

  const retiredImportPattern = new RegExp(
    `core/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }

  const lifecycleImport =
    "@orbit/core/session-affinity/cleanup-lifecycle";
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
  assert.deepEqual(workerConsumers.map((file) => path.relative(repoRoot, file)), [
    "apps/worker/src/jobs/registry.ts",
  ]);
});
