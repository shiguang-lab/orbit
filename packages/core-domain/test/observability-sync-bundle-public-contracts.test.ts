import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string } | string>;
};

const contracts = {
  "./metrics/observability": {
    entry: "./src/metrics/observability.ts",
    types: "./src/public/observability.d.ts",
    keys: ["buildHealthPayload", "buildTelemetryPayload"],
    retiredTarget: "./src/lib/monitoring/observability.ts",
  },
  "./control/sync-bundle": {
    entry: "./src/control/syncBundle.ts",
    types: "./src/public/syncBundle.d.ts",
    keys: ["buildConfigSyncEnvelope"],
    retiredTarget: "./src/lib/sync/bundle.ts",
  },
} as const;

function declaredValueKeys(source: string): string[] {
  return [...source.matchAll(/export\s+(?!type\s)\{([^}]+)\}/gs)].flatMap((match) =>
    match[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/).at(-1) ?? "")
      .filter(Boolean),
  );
}

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("observability and sync bundle expose exact runtime and declaration keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: contract.types,
      import: contract.entry,
    });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), `${subpath} runtime`);
    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    assert.deepEqual(declaredValueKeys(declaration).sort(), [...contract.keys].sort(), `${subpath} types`);
  }
});

test("wide targets and obsolete sync-bundle consumers stay retired", () => {
  const targets = Object.values(manifest.exports).map((entry) =>
    typeof entry === "string" ? entry : entry.import,
  );
  for (const contract of Object.values(contracts)) {
    assert.equal(targets.includes(contract.retiredTarget), false, contract.retiredTarget);
  }

  const consumers = sourceFiles(path.join(repoRoot, "apps"))
    .filter((file) => fs.readFileSync(file, "utf8").includes("core-domain/control/sync-bundle"))
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
  assert.deepEqual(consumers, ["apps/control-api/src/sync/handlers/bundle.handler.ts"]);
});
