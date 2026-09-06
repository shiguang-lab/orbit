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

const contracts = [
  {
    subpath: "./middleware/pre-request-hook-execution",
    types: "./src/public/preRequestHookExecution.d.ts",
    implementation: "./src/middleware/preRequestHookExecution.ts",
    keys: ["createHookContext", "runHooks"],
  },
  {
    subpath: "./middleware/pre-request-hook-management",
    types: "./src/public/preRequestHookManagement.d.ts",
    implementation: "./src/middleware/preRequestHookManagement.ts",
    keys: ["getAllHooks", "getHookLogs", "registerHook", "unregisterHook"],
  },
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

test("pre-request hook contracts expose only their consumed runtime keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.implementation });
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const names = [...declaration.matchAll(/export (?:const|function|class) (\w+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(names.sort(), [...contract.keys].sort(), contract.subpath);
  }
});

test("legacy registry aliases stay retired and management remains control-owned", () => {
  for (const alias of ["./runtime/middleware-registry", "./control/middleware-registry"]) {
    assert.equal(manifest.exports[alias], undefined, alias);
  }

  const oldImport = /core-domain\/(?:runtime|control)\/middleware-registry(?=["'])/;
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), oldImport, file);
    }
  }

  const managementImport =
    "@shiguang-gateway/core-domain/middleware/pre-request-hook-management";
  for (const root of ["apps/edge-gateway", "apps/realtime", "apps/worker", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.equal(fs.readFileSync(file, "utf8").includes(managementImport), false, file);
    }
  }
});
