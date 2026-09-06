import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string }>;
};

const contracts = {
  "./cache/semantic": {
    types: "./src/public/semanticCacheRuntime.d.ts",
    entry: "./src/cache/semantic.ts",
    keys: ["generateSignature", "getCachedResponse", "isCacheableForRead", "isCacheableForWrite", "setCachedResponse"],
  },
  "./shared/data-paths": {
    types: "./src/public/dataPaths.d.ts",
    entry: "./src/shared/dataPaths.ts",
    keys: ["resolveDataDir"],
  },
  "./db/runtime-hooks": {
    types: "./src/public/dbRuntimeHooks.d.ts",
    entry: "./src/db/runtimeHooks.ts",
    keys: ["registerDbRuntimeHooks"],
  },
} as const;

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("semantic cache, data paths, and DB hook registration expose exact runtime keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], { types: contract.types, import: contract.entry });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    for (const key of contract.keys) assert.match(declaration, new RegExp(`\\b${key}\\b`), key);
  }
});

test("edge/semantic-cache stays retired", () => {
  assert.equal(manifest.exports["./edge/semantic-cache"], undefined);
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), /core-domain\/edge\/semantic-cache/, file);
    }
  }
});
