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
    subpath: "./config/embeddingRegistry",
    target: "./exports/config/embeddingRegistry.ts",
    types: "./public/embeddingRegistry.d.ts",
    runtimeKeys: ["getAllEmbeddingModels", "getEmbeddingProvider"],
  },
  {
    subpath: "./services/accountFallback",
    target: "./exports/services/accountFallback.ts",
    types: "./public/accountFallback.d.ts",
    runtimeKeys: [
      "clearAllModelLockouts",
      "clearModelLock",
      "clearProviderFailure",
      "cooldownUntilMs",
      "getAllModelLockouts",
      "getModelLockoutInfo",
      "isCreditsExhausted",
      "isDailyQuotaExhausted",
    ],
  },
  {
    subpath: "./services/rateLimitManager",
    target: "./exports/services/rateLimitManager.ts",
    types: "./public/rateLimitManager.d.ts",
    runtimeKeys: [
      "applyRequestQueueSettings",
      "disableRateLimitProtection",
      "enableRateLimitProtection",
      "getAllRateLimitStatus",
      "getLearnedLimits",
      "getRateLimitStatus",
      "refreshConnectionRateLimits",
      "withRateLimit",
    ],
  },
] as const;

const retiredAliases = [
  "./config/embeddingRegistryRuntime",
  "./services/accountFallbackRuntime",
  "./services/rateLimitManagerRuntime",
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

test("duplicate-target contracts expose exact external runtime keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.target });

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.target)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtimeKeys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const declaredFunctions = [...declaration.matchAll(/export function (\w+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(declaredFunctions.sort(), [...contract.runtimeKeys].sort(), contract.types);

    const matchingTargets = Object.entries(manifest.exports).filter(([, value]) =>
      typeof value === "object" ? value.import === contract.target : value === contract.target,
    );
    assert.deepEqual(matchingTargets.map(([subpath]) => subpath), [contract.subpath]);
  }
});

test("runtime aliases stay retired across static, dynamic, and typeof imports", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);

  const retiredImportPattern = new RegExp(
    `@shiguang-gateway/open-sse/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const file of sourceFiles(path.join(repoRoot, "apps"))) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
  }
});
