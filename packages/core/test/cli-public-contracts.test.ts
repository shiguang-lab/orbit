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
    subpath: "./cli/runtime",
    types: "./src/public/cliRuntimeContract.d.ts",
    source: "./src/cli/runtime.ts",
    runtimeKeys: [
      "CLI_TOOL_IDS",
      "ensureCliConfigWriteAllowed",
      "getCliConfigHome",
      "getCliConfigPaths",
      "getCliPrimaryConfigPath",
      "getCliRuntimeStatus",
      "getKnownToolPaths",
      "getLookupEnv",
      "getOpenCodeConfigPath",
      "normalizeCliToolId",
      "shouldUseShellForCommand",
    ],
  },
  {
    subpath: "./cli/backups",
    types: "./src/public/cliBackups.d.ts",
    source: "./src/cli/backups.ts",
    runtimeKeys: [
      "createBackup",
      "createMultiBackup",
      "deleteBackup",
      "listBackups",
      "restoreBackup",
    ],
  },
  {
    subpath: "./cli/config-status",
    types: "./src/public/cliConfigStatus.d.ts",
    source: "./src/cli/configStatus.ts",
    runtimeKeys: ["checkToolConfigStatus"],
  },
] as const;

const retiredAliases = [
  "./shared/services/cliRuntime",
  "./control/cli-tools-runtime",
  "./shared/services/backupService",
  "./control/cli-tools-backups",
  "./shared/cli-tool-config-status",
  "./control/cli-tools-status",
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

test("CLI runtime, backup, and config status exports are exact physical contracts", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.source });

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.source)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtimeKeys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const declaredValues = [
      ...declaration.matchAll(/export (?:function|const) (\w+)/g),
    ].map((match) => match[1]);
    assert.deepEqual(declaredValues.sort(), [...contract.runtimeKeys].sort(), contract.types);
  }
});

test("scenario-specific and shared-service CLI aliases stay retired", () => {
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
