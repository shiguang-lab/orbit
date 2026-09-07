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

const expectedRuntimeExports = [
  "AI_PROVIDERS",
  "ANTHROPIC_COMPATIBLE_PREFIX",
  "APIKEY_PROVIDERS",
  "AUDIO_ONLY_PROVIDERS",
  "CLAUDE_CODE_COMPATIBLE_PREFIX",
  "CLOUD_AGENT_PROVIDERS",
  "IDE_PROVIDER_IDS",
  "LOCAL_PROVIDERS",
  "NOAUTH_PROVIDERS",
  "OAUTH_PROVIDERS",
  "OPENAI_COMPATIBLE_PREFIX",
  "SEARCH_PROVIDERS",
  "UPSTREAM_PROXY_PROVIDERS",
  "USAGE_SUPPORTED_PROVIDERS",
  "WEB_COOKIE_PROVIDERS",
  "getProviderAlias",
  "getProviderByAlias",
  "getProviderById",
  "getProviderConnectionFamilyIds",
  "isAnthropicCompatibleProvider",
  "isClaudeCodeCompatibleProvider",
  "isLocalProvider",
  "isOpenAICompatibleProvider",
  "isSelfHostedChatProvider",
  "providerAllowsOptionalApiKey",
  "resolveProviderId",
  "supportsApiKeyOnFreeProvider",
] as const;

const retiredAliases = [
  "./control/provider-discovery-support/providers",
  "./usage/provider-limits-support/providers",
  "./catalog/provider-node-prefixes",
  "./shared/constants/providers",
  "./catalog/provider-metadata",
  "./edge/provider-constants",
  "./runtime/provider-constants",
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

test("catalog is the provider metadata contract", async () => {
  const entry = manifest.exports["./catalog"];
  assert.equal(typeof entry, "object");
  assert.deepEqual(entry, {
    types: "./src/catalog/index.ts",
    import: "./src/catalog/index.ts",
  });

  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
  );
  for (const exportName of expectedRuntimeExports) {
    assert.equal(exportName in runtime, true, exportName);
  }

});

test("redundant provider constant aliases and declarations stay retired", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/providerMetadata.d.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/providerNodeConstants.d.ts")), false);

  const retiredImportPattern = new RegExp(
    `providers/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})`,
  );
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
