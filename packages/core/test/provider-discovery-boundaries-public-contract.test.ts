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
  "./catalog/provider-models": {
    entry: ["./src/public/catalogProviderModels.d.ts", "./src/catalog/providerModels.ts"],
    keys: ["PROVIDER_ID_TO_ALIAS", "PROVIDER_MODELS", "getModelsByProviderId"],
  },
  "./catalog/no-auth-providers": {
    entry: ["./src/public/catalogNoAuthProviders.d.ts", "./src/catalog/noAuthProviders.ts"],
    keys: ["isNoAuthProviderBlocked", "isNoAuthProviderKey", "isNoAuthRawProviderPrefix", "isProviderBlockedByIdOrAlias", "normalizeBlockedProviderSet"],
  },
  "./control/authenticated": {
    entry: ["./src/public/authenticated.d.ts", "./src/control/authenticated.ts"],
    keys: ["isAuthRequired", "isAuthenticated", "isDashboardSessionAuthenticated"],
  },
  "./network/outbound-url-guard-policy": {
    entry: ["./src/public/outboundUrlGuardPolicy.d.ts", "./src/network/outboundUrlGuardPolicy.ts"],
    keys: [
      "arePrivateProviderUrlsAllowed",
      "getProviderOutboundGuard",
      "getProviderValidationGuard",
      "parseAndValidateWebhookUrl",
    ],
  },
  "./network/safe-outbound-fetch": {
    entry: ["./src/public/safeOutboundFetch.d.ts", "./src/network/safeOutboundFetch.ts"],
    keys: [
      "SAFE_OUTBOUND_FETCH_PRESETS",
      "SafeOutboundFetchError",
      "getSafeOutboundFetchErrorStatus",
      "safeOutboundFetch",
    ],
  },
} as const;

const retiredAliases = [
  "./control/provider-discovery-support/models",
  "./control/provider-discovery-support/apiAuth",
  "./control/provider-discovery-support/alibabaProviderRegions",
  "./control/provider-discovery-support/outboundUrlGuardPolicy",
  "./control/provider-discovery-support/safeOutboundFetch",
  "./control/provider-discovery-support/noAuthProviders",
  "./edge/alibaba-provider-regions",
  "./runtime/no-auth-providers",
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

test("provider discovery dependencies use narrow domain-owned contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    const entry = manifest.exports[subpath];
    assert.deepEqual(entry, { types: contract.entry[0], import: contract.entry[1] }, subpath);
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
  }
});

test("provider-discovery scenario aliases stay retired", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  const retiredImportPattern = new RegExp(
    `core/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});
