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

const expectedContracts = {
  "./usage/history": ["saveRequestUsage"],
  "./usage/model-latency-stats": ["getModelLatencyStats"],
  "./usage/request-logs": ["appendRequestLog", "getRecentLogs"],
  "./usage/pending-requests": [
    "finalizeMostRecentPendingRequest",
    "finalizePendingRequestById",
    "getCompletedDetails",
    "getPendingById",
    "trackPendingRequest",
  ],
  "./usage/call-logs": [
    "deleteCallLogsBefore",
    "exportCallLogsSince",
    "getCallLogById",
    "getCallLogs",
    "saveCallLog",
  ],
  "./usage/stats": [
    "getConnectionSpendUsdSinceAdded",
    "getMonthlyProviderTokensForConnection",
    "getUsageStats",
  ],
} as const;

function declaredFunctions(declarationPath: string): string[] {
  const source = fs.readFileSync(path.join(packageRoot, declarationPath), "utf8");
  return [...source.matchAll(/export function (\w+)\s*\(/g)]
    .map((match) => match[1])
    .sort();
}

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

test("usage package subpaths expose focused and accurate declarations", async () => {
  for (const [subpath, functions] of Object.entries(expectedContracts)) {
    const entry = manifest.exports[subpath];
    assert.equal(typeof entry, "object", `${subpath} must be a typed package export`);
    const { types: declarationPath, import: implementationPath } = entry as {
      types?: string;
      import?: string;
    };
    assert.ok(declarationPath, `${subpath} must declare its public types`);
    assert.ok(implementationPath, `${subpath} must declare its runtime implementation`);
    assert.deepEqual(declaredFunctions(declarationPath), [...functions].sort(), subpath);

    const runtime = await import(pathToFileURL(path.join(packageRoot, implementationPath)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...functions].sort(), `${subpath} runtime`);
  }
});

test("mixed usage database facade and aliases stay retired", () => {
  assert.equal(manifest.exports["./edge/usage-db"], undefined);
  assert.equal(manifest.exports["./runtime/usage-db"], undefined);
  assert.equal(manifest.exports["./control/provider-discovery-support/callLogs"], undefined);
  assert.equal(manifest.exports["./usage/reporting-support/call-logs"], undefined);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/lib/usageDb.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/usageDb.d.ts")), false);

  const consumers = [
    ...sourceFiles(path.join(repoRoot, "apps")),
    ...sourceFiles(path.join(repoRoot, "packages/open-sse")),
  ];
  for (const file of consumers) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /core-domain\/(?:edge\/usage-db|runtime\/usage-db|control\/provider-discovery-support\/callLogs|usage\/reporting-support\/call-logs)/,
      file,
    );
  }
});
