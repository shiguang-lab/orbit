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
    subpath: "./db/provider-connection-view",
    types: "./src/public/providerConnectionViewDb.d.ts",
    implementation: "./src/db/providerConnectionView.ts",
    keys: ["createLazyConnectionView", "toProviderConnection"],
  },
  {
    subpath: "./db/context-handoffs",
    types: "./src/public/contextHandoffsDb.d.ts",
    implementation: "./src/db/contextHandoffs.ts",
    keys: [
      "cleanupExpiredHandoffs",
      "deleteHandoff",
      "deleteSessionModelHistory",
      "getHandoff",
      "getLastSessionModel",
      "hasActiveHandoff",
      "recordSessionModelUsage",
      "upsertHandoff",
    ],
  },
  {
    subpath: "./db/exclusive-connection-leases",
    types: "./src/public/exclusiveConnectionLeasesDb.d.ts",
    implementation: "./src/db/exclusiveConnectionLeases.ts",
    keys: [
      "LEASE_OWNER_PATTERN",
      "acquireExclusiveConnectionLease",
      "assertExclusiveConnectionLeaseFence",
      "getActiveExclusiveConnectionLease",
      "getExclusiveLeaseOccupancy",
      "hashLeaseOwnerId",
      "invalidateExclusiveConnectionLease",
      "transitionExclusiveConnectionLease",
    ],
  },
] as const;
const retiredAliases = [
  "./runtime/provider-connection-view",
  "./runtime/context-handoffs",
  "./runtime/exclusive-leases",
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

test("DB contracts replace broad runtime aliases with consumed runtime keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.implementation });
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    for (const key of contract.keys) assert.match(declaration, new RegExp(`\\b${key}\\b`));
  }
});

test("runtime DB aliases stay retired", () => {
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
