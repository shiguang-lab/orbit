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
  "./sync/cloud": {
    entry: "./src/sync/cloud.ts",
    runtime: ["CLOUD_URL", "fetchWithTimeout", "syncToCloud"],
  },
  "./usage/api-key-limits": {
    entry: "./src/usage/apiKeyLimits.ts",
    runtime: ["buildApiKeyUsageLimitPercentText", "getApiKeyUsageLimitStatus"],
  },
  "./logging/environment": {
    entry: "./src/logging/environment.ts",
    runtime: [
      "getAppLogFilePath",
      "getAppLogRetentionDays",
      "getCallLogRetentionDays",
      "getCallLogsTableMaxRows",
      "getProxyLogsTableMaxRows",
    ],
  },
} as const;

function declarationEntry(sourceEntry: string): string {
  return sourceEntry.replace("./src/", "./dist/types/").replace(/\.ts$/, ".d.ts");
}

const retiredSubpaths = [
  "./control/cloud-sync",
  "./usage/provider-limits-support/cloudSync",
  "./control/api-key-usage-limits",
  "./usage/internal-command-support/api-key-usage-limits",
  "./shared/log-env",
  "./control/cli-tools-log",
] as const;

const retiredDeclarations = [
  "cloudSync.d.ts",
  "apiKeyUsageLimits.d.ts",
  "logEnv.d.ts",
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

test("shared operational capabilities use narrow semantic contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: declarationEntry(contract.entry),
      import: contract.entry,
    });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtime].sort(), `${subpath} runtime`);
  }
});

test("scenario-specific operational aliases stay retired", () => {
  for (const subpath of retiredSubpaths) assert.equal(manifest.exports[subpath], undefined, subpath);
  for (const declaration of retiredDeclarations) {
    assert.equal(fs.existsSync(path.join(packageRoot, "src/public", declaration)), false, declaration);
  }

  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredSubpaths
      .map((subpath) => subpath.slice(2).replaceAll("/", "\\/"))
      .join("|")})`,
  );
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
