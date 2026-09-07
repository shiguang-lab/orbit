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
  "./routing/peer-routing": {
    entry: "./src/routing/peerRouting.ts",
    runtime: ["applyPeerTraceHeader", "rejectPeerRequest"],
  },
  "./routing/reasoning-policy": {
    entry: "./src/routing/reasoningPolicy.ts",
    runtime: [
      "applyReasoningRuleDirective",
      "attachReasoningRuleDirective",
      "extractReasoningIntent",
      "filterComboForReasoningDecision",
      "resolveReasoningRoutingRule",
      "resolveReasoningSourceModels",
      "validateCodexWsDecision",
    ],
  },
  "./providers/request-defaults": {
    entry: "./src/providers/requestDefaults.ts",
    runtime: [
      "ensureOpenAIStoreSessionFallback",
      "getClaudeCodeCompatibleRequestDefaults",
      "getCodexRequestDefaults",
      "isOpenAIResponsesStoreEnabled",
      "normalizeCodexServiceTier",
      "sanitizeProviderSpecificDataForResponse",
    ],
  },
} as const;

function declarationEntry(sourceEntry: string): string {
  return sourceEntry.replace("./src/", "./dist/types/").replace(/\.ts$/, ".d.ts");
}
const retiredSubpaths = [
  "./edge/peer-routing",
  "./runtime/peer-routing",
  "./edge/reasoning-routing-policy",
  "./runtime/reasoning-policy",
  "./edge/provider-request-defaults",
  "./runtime/request-defaults",
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

test("routing and provider defaults use narrow neutral contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: declarationEntry(contract.entry),
      import: contract.entry,
    });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtime].sort(), `${subpath} runtime`);
  }

  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/peerRouting.d.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/reasoningRoutingPolicy.d.ts")), false);
});

test("edge and runtime routing aliases stay retired", () => {
  for (const subpath of retiredSubpaths) assert.equal(manifest.exports[subpath], undefined, subpath);

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
