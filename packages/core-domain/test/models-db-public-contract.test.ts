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
  "SYNCED_AVAILABLE_MODELS_MALFORMED",
  "deleteImportedCustomModels",
  "deleteSyncedAvailableModelsForProvider",
  "getAllCustomModels",
  "getAllSyncedAvailableModels",
  "getCustomModels",
  "getModelNormalizeToolCallId",
  "getModelPreserveOpenAIDeveloperRole",
  "getModelUpstreamExtraHeaders",
  "getSyncedAvailableModels",
  "getSyncedAvailableModelsByConnection",
  "getSyncedAvailableModelsForConnection",
  "replaceSyncedAvailableModelsForConnection",
] as const;

const retiredAliases = [
  "./control/provider-discovery-support/modelsDb",
  "./db/models-runtime",
  "./runtime/models-db",
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

test("db/models exposes only the shared model catalog persistence contract", async () => {
  const entry = manifest.exports["./db/models"];
  assert.deepEqual(entry, {
    types: "./src/public/modelsDb.d.ts",
    import: "./src/db/models.ts",
  });

  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
  );
  assert.deepEqual(Object.keys(runtime).sort(), [...expectedRuntimeExports].sort());

  const declaration = fs.readFileSync(
    path.join(packageRoot, (entry as { types: string }).types),
    "utf8",
  );
  for (const exportedName of expectedRuntimeExports) {
    assert.match(declaration, new RegExp(`\\b${exportedName}\\b`), exportedName);
  }
  assert.doesNotMatch(declaration, /\b(?:getHiddenModelsByProvider|getModelIsHidden|setModelIsHidden|getMitmAlias)\b/);
});

test("scenario-specific model DB aliases stay retired", () => {
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
