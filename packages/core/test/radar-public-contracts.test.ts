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
  ["./radar/read", "./src/public/radarRead.d.ts", "./src/radar/read.ts", ["getCatalogWithoutOverlay", "getRadarCatalog", "getRadarIntel", "getRadarOffers", "getRadarReferrals"]],
  ["./radar/store", "./src/public/radarStore.d.ts", "./src/radar/store.ts", [
    "clearRadarLocalModelOverride",
    "getRadarCache",
    "getRadarIntelCache",
    "getRadarOffersCache",
    "getRadarReferralsCache",
    "getRadarSettings",
    "listRadarLocalModelState",
    "setRadarKey",
    "setRadarLocalModelOverride",
    "setRadarModelTombstone",
    "setRadarOptIn",
  ]],
  ["./radar/sync/catalog", "./src/public/radarCatalogSync.d.ts", "./src/radar/sync/catalog.ts", ["syncRadar"]],
  ["./radar/sync/referrals", "./src/public/radarReferralsSync.d.ts", "./src/radar/sync/referrals.ts", ["shouldSyncReferralsOnRead", "syncRadarReferrals"]],
  ["./radar/sync/offers", "./src/public/radarOffersSync.d.ts", "./src/radar/sync/offers.ts", ["syncRadarOffers"]],
  ["./radar/sync/intel", "./src/public/radarIntelSync.d.ts", "./src/radar/sync/intel.ts", ["syncRadarIntel"]],
  ["./radar/sync-lifecycle", "./src/public/radarSyncLifecycle.d.ts", "./src/radar/syncLifecycle.ts", ["initRadarSyncScheduler", "stopRadarSyncScheduler"]],
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

function wrapperKeys(source: string): string[] {
  const block = source.match(/export\s*\{([\s\S]*?)\}\s*from/);
  assert.ok(block, "wrapper must use an explicit named export list");
  return block[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name.split(/\s+as\s+/).at(-1)!);
}

test("Radar public contracts expose matching exact type and runtime keys", async () => {
  for (const [subpath, types, implementation, expectedKeys] of contracts) {
    const entry = manifest.exports[subpath];
    assert.deepEqual(entry, { types, import: implementation });
    const source = fs.readFileSync(path.join(packageRoot, implementation), "utf8");
    assert.deepEqual(wrapperKeys(source).sort(), [...expectedKeys].sort(), `${subpath} type keys`);
    const declaration = fs.readFileSync(path.join(packageRoot, types), "utf8");
    const declaredKeys = [...declaration.matchAll(/export function (\w+)/g)].map((match) => match[1]);
    assert.deepEqual(declaredKeys.sort(), [...expectedKeys].sort(), `${subpath} declaration keys`);
    const runtime = await import(pathToFileURL(path.join(packageRoot, implementation)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...expectedKeys].sort(), `${subpath} runtime keys`);
  }
});

test("broad Radar aliases and declaration stay retired", () => {
  const aliases = [
    "./control/radar",
    "./control/radar-db",
    "./control/radar-sync",
    "./control/radar-referrals-sync",
    "./control/radar-offers-sync",
    "./control/radar-intel-sync",
    "./worker/radar-scheduler",
  ];
  for (const alias of aliases) assert.equal(manifest.exports[alias], undefined, alias);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/radar.d.ts")), false);

  const retiredImport = /core\/(?:control\/radar(?:-db|-sync|-referrals-sync|-offers-sync|-intel-sync)?|worker\/radar-scheduler)(?=["'])/;
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImport, file);
    }
  }
});

test("Radar scheduler lifecycle remains worker-owned", () => {
  const lifecycleImport = "@orbit/core/radar/sync-lifecycle";
  const workerFiles = sourceFiles(path.join(repoRoot, "apps/worker/src"));
  assert.equal(
    workerFiles.filter((file) => fs.readFileSync(file, "utf8").includes(lifecycleImport)).length,
    1,
  );
  for (const app of ["control", "gateway", "realtime"]) {
    for (const file of sourceFiles(path.join(repoRoot, "apps", app, "src"))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), /core\/radar\/sync-lifecycle/, file);
    }
  }
});
