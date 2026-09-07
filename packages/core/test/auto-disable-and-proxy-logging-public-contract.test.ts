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
    subpath: "./resilience/auto-disable-banned",
    types: "./src/public/autoDisableBannedPolicy.d.ts",
    source: "./src/resilience/autoDisableBanned.ts",
    runtimeKeys: ["normalizeAutoDisableBannedScope", "shouldAutoDisableBannedConnection"],
  },
  {
    subpath: "./logging/proxy-logs",
    types: "./src/public/proxyLogOperations.d.ts",
    source: "./src/logging/proxyLogs.ts",
    runtimeKeys: ["clearProxyLogs", "getProxyLogs", "logProxyEvent"],
  },
  {
    subpath: "./logging/proxy-log-settings",
    types: "./src/public/loggingProxyLogSettings.d.ts",
    source: "./src/logging/proxyLogSettings.ts",
    runtimeKeys: ["isProxyLogIncludeIps"],
  },
] as const;

const retiredAliases = [
  "./shared/auto-disable-banned",
  "./runtime/auto-disable-banned",
  "./control/proxy-logs",
  "./shared/proxy-log-settings",
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

test("auto-disable policy and proxy logging expose exact narrow runtime contracts", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.source });

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.source)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtimeKeys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const declaredFunctions = [...declaration.matchAll(/export function (\w+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(declaredFunctions.sort(), [...contract.runtimeKeys].sort(), contract.types);
  }
});

test("proxy log settings remain separate from proxy log operations", async () => {
  const operationKeys = Object.keys(
    await import(pathToFileURL(path.join(packageRoot, contracts[1].source)).href),
  );
  const settingKeys = Object.keys(
    await import(pathToFileURL(path.join(packageRoot, contracts[2].source)).href),
  );
  assert.deepEqual(operationKeys.filter((key) => settingKeys.includes(key)), []);
});

test("scenario-specific auto-disable and proxy logging aliases stay retired", () => {
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
