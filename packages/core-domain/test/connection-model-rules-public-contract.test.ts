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

const canonicalSubpath = "./routing/connection-model-rules";
const canonicalEntry = "./src/routing/connectionModelRules.ts";
const retiredSubpaths = [
  "./edge/connection-model-rules",
  "./runtime/connection-model-rules",
  "./usage/reporting-support/domain/connectionModelRules",
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

test("connection model rules use one narrow routing contract", async () => {
  assert.deepEqual(manifest.exports[canonicalSubpath], {
    types: canonicalEntry,
    import: canonicalEntry,
  });

  const runtime = await import(pathToFileURL(path.join(packageRoot, canonicalEntry)).href);
  assert.deepEqual(Object.keys(runtime).sort(), [
    "hasEligibleConnectionForModel",
    "isModelAdvertisedByConnection",
    "isModelExcludedByConnection",
  ]);
});

test("scenario-specific connection model rule aliases stay retired", () => {
  for (const subpath of retiredSubpaths) assert.equal(manifest.exports[subpath], undefined, subpath);
  assert.equal(
    fs.existsSync(path.join(packageRoot, "src/public/connectionModelRules.d.ts")),
    false,
  );

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
