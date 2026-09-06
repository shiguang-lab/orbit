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
    subpath: "./usage/claude-extra-usage",
    types: "./src/public/claudeExtraUsage.d.ts",
    implementation: "./src/usage/claudeExtraUsage.ts",
    keys: ["buildClaudeExtraUsageConnectionUpdate", "isClaudeExtraUsageBlockEnabled"],
  },
  {
    subpath: "./usage/quota-snapshots",
    types: "./src/public/usageQuotaSnapshots.d.ts",
    implementation: "./src/usage/quotaSnapshots.ts",
    keys: ["getAggregatedSnapshots", "getQuotaSnapshots"],
  },
  {
    subpath: "./usage/utilization",
    types: "./src/public/usageUtilization.d.ts",
    implementation: "./src/usage/utilization.ts",
    keys: ["BUCKET_SIZES"],
  },
] as const;

const retiredAliases = [
  "./edge/claude-extra-usage",
  "./usage/provider-limits-support/claudeExtraUsage",
  "./db/quota-snapshots",
  "./usage/reporting-support/quota-snapshots",
  "./shared/utilization",
  "./usage/reporting-support/shared/types/utilization",
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

test("usage contracts expose only their consumed runtime keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.implementation });
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const declaredValues = [
      ...declaration.matchAll(/export (?:const|function|class) (\w+)/g),
    ].map((match) => match[1]);
    assert.deepEqual(declaredValues.sort(), [...contract.keys].sort(), contract.subpath);
  }
});

test("usage scenario aliases and declarations stay retired", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  for (const declaration of ["quotaSnapshots.d.ts", "utilization.d.ts"]) {
    assert.equal(fs.existsSync(path.join(packageRoot, "src/public", declaration)), false);
  }

  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
