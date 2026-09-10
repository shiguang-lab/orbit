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
  "./db/connection": ["getDbInstance", "resetDbInstance"],
  "./db/ping": ["pingDb"],
  "./db/health": ["isNativeSqliteLoadError", "runManagedDbHealthCheck", "runManagedWalCheckpoint"],
  "./db/runtime-lifecycle": ["closeDbInstance"],
} as const;

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

test("database core capabilities dynamically load through distinct narrow contracts", async () => {
  const implementationPaths = new Set<string>();
  for (const [subpath, expected] of Object.entries(contracts)) {
    const entry = manifest.exports[subpath];
    assert.equal(typeof entry, "object", subpath);
    const { types, import: implementation } = entry as { types?: string; import?: string };
    assert.ok(types, `${subpath} must have an explicit declaration`);
    assert.ok(implementation, `${subpath} must have an implementation`);
    assert.notEqual(implementation, "./src/lib/db/core.ts", subpath);
    implementationPaths.add(implementation);

    const runtime = await import(pathToFileURL(path.join(packageRoot, implementation)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...expected].sort(), `${subpath} runtime`);

    const declaration = fs.readFileSync(path.join(packageRoot, types), "utf8");
    const functions = [...declaration.matchAll(/export function (\w+)/g)].map((match) => match[1]);
    assert.deepEqual(functions.sort(), [...expected].sort(), `${subpath} declarations`);
  }
  assert.equal(implementationPaths.size, Object.keys(contracts).length);
});

test("scenario-specific database core aliases stay retired", () => {
  assert.equal(manifest.exports["./runtime/db-core"], undefined);
  assert.equal(manifest.exports["./usage/reporting-support/database"], undefined);

  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(
        source,
        /core\/(?:runtime\/db-core|usage\/reporting-support\/database)/,
        file,
      );
      if (source.includes("core/db/ping")) {
        assert.doesNotMatch(source, /import\s*{[^}]*getDbInstance[^}]*}\s*from\s*["']@orbit\/core\/db\/ping["']/s, file);
      }
    }
  }
});

test("database connection acquisition owns no periodic maintenance lifecycle", () => {
  const source = fs.readFileSync(path.join(packageRoot, "src/lib/db/core.ts"), "utf8");
  assert.doesNotMatch(source, /\b(?:setInterval|clearInterval)\s*\(/);
  assert.doesNotMatch(source, /start(?:DbHealthCheck|WalTruncate)Scheduler/);
  const getDbBody = source.slice(source.indexOf("export function getDbInstance"), source.indexOf("export function pingDb"));
  assert.doesNotMatch(getDbBody, /\brunDbHealthCheck\s*\(/);
});
