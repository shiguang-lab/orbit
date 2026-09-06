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
  "./usage/analytics": [
    "buildPresetUnifiedSource",
    "buildUnifiedSource",
    "getAccountCostRows",
    "getAccountUsageRows",
    "getApiKeyMetadataRows",
    "getApiKeyUsageRows",
    "getDailyCostRows",
    "getDailyUsage",
    "getErrorTypeBreakdown",
    "getFallbackStats",
    "getHeatmapRows",
    "getModelUsageRows",
    "getPresetCostModelRows",
    "getProviderCostRows",
    "getProviderDailyUsageRows",
    "getProviderUsageRows",
    "getServiceTierUsageRows",
    "getUsageSummary",
    "getWeeklyPatternRows",
  ],
  "./quota/provider-response": ["normalizeQuotaResponse", "sanitizeQuotaProvider"],
  "./control/token-limit-validation": ["setTokenLimitSchema"],
} as const;

test("usage control capabilities are split into focused physical contracts", async () => {
  for (const [subpath, expectedKeys] of Object.entries(contracts)) {
    const entry = manifest.exports[subpath];
    assert.equal(typeof entry, "object", subpath);
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...expectedKeys].sort(), subpath);
  }
});

test("control/usage aggregate facade stays retired", () => {
  assert.equal(manifest.exports["./control/usage"], undefined);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/lib/usage/usageControl.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/usageControl.d.ts")), false);
  for (const root of ["apps", "packages/open-sse"]) {
    const pending = [path.join(repoRoot, root)];
    while (pending.length) {
      const dir = pending.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) pending.push(target);
        else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
          assert.doesNotMatch(
            fs.readFileSync(target, "utf8"),
            /@shiguang-gateway\/core-domain\/control\/usage(?=["'])/,
            target,
          );
        }
      }
    }
  }
});
