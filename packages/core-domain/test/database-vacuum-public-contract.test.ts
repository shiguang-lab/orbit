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

const retiredAliases = ["./db/vacuum-scheduler", "./worker/database-vacuum"] as const;

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

test("database vacuum state and worker lifecycle are separate narrow contracts", async () => {
  const databaseEntry = manifest.exports["./db/vacuum"] as { types: string; import: string };
  assert.deepEqual(databaseEntry, {
    types: "./src/public/databaseVacuum.d.ts",
    import: "./src/db/vacuum.ts",
  });
  const lifecycleEntry = manifest.exports["./worker/database-vacuum-lifecycle"] as {
    types: string;
    import: string;
  };
  assert.deepEqual(lifecycleEntry, {
    types: "./src/public/databaseVacuumLifecycle.d.ts",
    import: "./src/worker/databaseVacuumLifecycle.ts",
  });

  const databaseRuntime = await import(
    pathToFileURL(path.join(packageRoot, databaseEntry.import)).href
  );
  const lifecycleRuntime = await import(
    pathToFileURL(path.join(packageRoot, lifecycleEntry.import)).href
  );
  assert.deepEqual(Object.keys(databaseRuntime).sort(), ["getState", "runNow"]);
  assert.deepEqual(Object.keys(lifecycleRuntime).sort(), ["initVacuumScheduler", "stop"]);
});

test("mixed database vacuum aliases stay retired", () => {
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
