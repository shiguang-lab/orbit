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
  "./catalog/synced-model-capabilities": ["getSyncedCapabilities"],
  "./pricing/sync": ["clearSyncedPricing", "getSyncStatus", "syncPricingFromSources"],
  "./db/cleanup": [
    "RESET_USAGE_HISTORY_PERIODS",
    "purgeCallLogs",
    "purgeDetailedLogs",
    "purgeQuotaSnapshots",
    "resetUsageHistory",
  ],
  "./worker/model-sync-lifecycle": ["startPeriodicSync", "stopPeriodicSync"],
  "./worker/pricing-sync-lifecycle": ["startPeriodicSync", "stopPeriodicSync"],
  "./worker/database-cleanup-lifecycle": ["startCleanupScheduler", "stopCleanupScheduler"],
} as const;

const retiredAliases = [
  "./catalog/models-dev-sync",
  "./worker/model-sync",
  "./worker/pricing-sync",
  "./worker/database-cleanup",
  "./control/database-cleanup",
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

test("sync, cleanup, and worker lifecycle contracts remain narrow", async () => {
  for (const [subpath, expectedKeys] of Object.entries(contracts)) {
    const entry = manifest.exports[subpath];
    assert.equal(typeof entry, "object", subpath);
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...expectedKeys].sort(), subpath);
  }
});

test("mixed sync and cleanup aliases stay retired", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
