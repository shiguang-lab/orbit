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
  "DEFAULT_RESILIENCE_SETTINGS",
  "buildLegacyResilienceCompat",
  "isStreamRecoveryExplicitlyConfigured",
  "mergeResilienceSettings",
  "resolveResilienceSettings",
] as const;

const retiredAliases = [
  "./control/resilience-settings",
  "./runtime/resilience-settings",
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

test("resilience/settings is the single narrow resilience-settings contract", async () => {
  const entry = manifest.exports["./resilience/settings"];
  assert.equal(typeof entry, "object");
  assert.deepEqual(entry, {
    types: "./src/public/resilienceSettings.d.ts",
    import: "./src/resilience/settings.ts",
  });

  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
  );
  assert.deepEqual(Object.keys(runtime).sort(), [...expectedRuntimeExports].sort());

  const declaration = fs.readFileSync(
    path.join(packageRoot, (entry as { types: string }).types),
    "utf8",
  );
  const declaredRuntimeNames = [
    ...declaration.matchAll(/export (?:const|function) (\w+)/g),
  ].map((match) => match[1]);
  assert.deepEqual(declaredRuntimeNames.sort(), [...expectedRuntimeExports].sort());
});

test("scenario-specific resilience-settings aliases stay retired", () => {
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
