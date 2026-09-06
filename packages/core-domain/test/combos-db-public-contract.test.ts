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

const canonicalSubpath = "./db/combos";
const canonicalEntry = "./src/db/combos.ts";
const runtimeExports = [
  "createCombo",
  "deleteCombo",
  "deleteComboByName",
  "getComboById",
  "getComboByName",
  "getComboByNameInsensitive",
  "getCombos",
  "getCombosCount",
  "reorderCombos",
  "setActiveCombo",
  "updateCombo",
] as const;
const retiredSubpaths = [
  "./runtime/combos-db",
  "./usage/reporting-support/combos",
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

test("db/combos is the single narrow combo persistence contract", async () => {
  assert.deepEqual(manifest.exports[canonicalSubpath], {
    types: canonicalEntry,
    import: canonicalEntry,
  });

  const runtime = await import(pathToFileURL(path.join(packageRoot, canonicalEntry)).href);
  assert.deepEqual(Object.keys(runtime).sort(), [...runtimeExports].sort());
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/combosDb.d.ts")), false);
});

test("scenario-specific combo database aliases stay retired", () => {
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
