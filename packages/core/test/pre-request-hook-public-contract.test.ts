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

test("legacy registry and in-memory management entries stay retired", () => {
  for (const alias of [
    "./runtime/middleware-registry",
    "./control/middleware-registry",
    "./middleware/pre-request-hook-management",
  ]) {
    assert.equal(manifest.exports[alias], undefined, alias);
  }

  const oldImport = /core\/(?:runtime|control)\/middleware-registry(?=["'])/;
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), oldImport, file);
    }
  }

  const registry = fs.readFileSync(
    path.join(packageRoot, "src/lib/middleware/registry.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    registry,
    /__shiguangGatewayPreRequestRegistry|loadHooksFromConfig|initPreRequestRegistry|clearAllHooks/,
  );
  assert.match(registry, /getEnabledMiddlewareHooks\(\)/);
  assert.match(registry, /recordHookExecution\(hook\.name/);
  assert.match(registry, /insertHookLog\(/);

  for (const file of sourceFiles(path.join(repoRoot, "apps/control-api/src"))) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /pre-request-hook-(?:execution|management)/, file);
  }
  const controlRepository = fs.readFileSync(
    path.join(repoRoot, "apps/control-api/src/middleware-hooks/middleware-hooks.repository.ts"),
    "utf8",
  );
  const controlService = fs.readFileSync(
    path.join(repoRoot, "apps/control-api/src/middleware-hooks/middleware-hooks.service.ts"),
    "utf8",
  );
  assert.match(controlRepository, /FROM middleware_logs/);
  assert.match(controlService, /this\.repository\.logs\(/);
});
