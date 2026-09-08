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
  "./resilience/connection-recovery-policy": {
    entry: "./src/resilience/connectionRecoveryPolicy.ts",
    runtime: ["TERMINAL_CONNECTION_STATUSES"],
  },
  "./resilience/connection-recovery": {
    entry: "./src/resilience/connectionRecovery.ts",
    types: "./src/public/connectionRecoveryOperation.d.ts",
    runtime: ["resolveConnectionRecoveryIntervalMs", "runConnectionRecoveryTick"],
  },
} as const;

function declarationEntry(sourceEntry: string): string {
  return sourceEntry.replace("./src/", "./dist/types/").replace(/\.ts$/, ".d.ts");
}
const retiredSubpaths = [
  "./shared/connection-recovery-policy",
  "./control/resilience-connection-recovery",
  "./worker/connection-recovery",
  "./worker/connection-recovery-lifecycle",
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

test("connection recovery policy and run-once operation have distinct narrow contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: "types" in contract ? contract.types : declarationEntry(contract.entry),
      import: contract.entry,
    });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtime].sort(), `${subpath} runtime`);
  }
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/connectionRecovery.d.ts")), false);
});

test("scenario-specific connection recovery aliases stay retired", () => {
  for (const subpath of retiredSubpaths) assert.equal(manifest.exports[subpath], undefined, subpath);

  const retiredImportPattern = new RegExp(
    `core/(?:${retiredSubpaths
      .map((subpath) => subpath.slice(2).replaceAll("/", "\\/"))
      .join("|")})(?:["'])`,
  );
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImportPattern, file);
    }
  }
});

test("retired connection recovery lifecycle is absent from app consumers", () => {
  const lifecycleImport = /core\/worker\/connection-recovery-lifecycle/;
  for (const root of [
    "apps/console",
    "apps/cli",
    "apps/control",
    "apps/gateway",
    "apps/realtime",
    "packages/inference",
  ]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), lifecycleImport, file);
    }
  }
  assert.equal(fs.existsSync(path.join(packageRoot, "src/worker/connectionRecoveryLifecycle.ts")), false);
});
