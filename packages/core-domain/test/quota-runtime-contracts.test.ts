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
    subpath: "./quota/enforcement-decision",
    types: "./src/public/quotaEnforcementDecision.d.ts",
    implementation: "./src/quota/enforcementDecision.ts",
    keys: [],
  },
  {
    subpath: "./quota/reservations",
    types: "./src/public/quotaReservations.d.ts",
    implementation: "./src/quota/reservations.ts",
    keys: ["canAffordRequest", "reserveQuota"],
  },
  {
    subpath: "./quota/consumption-recorder",
    types: "./src/public/quotaConsumptionRecorder.d.ts",
    implementation: "./src/quota/consumptionRecorder.ts",
    keys: ["buildConsumptionCost", "recordStreamingConsumption", "scheduleRecordConsumption"],
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

test("quota decision and runtime contracts expose exact value keys", async () => {
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.implementation });
    const runtime = await import(
      pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const valueNames = [...declaration.matchAll(/export (?:const|function|class) (\w+)/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(valueNames.sort(), [...contract.keys].sort(), contract.subpath);
  }
  assert.match(
    fs.readFileSync(path.join(packageRoot, "src/public/quotaEnforcementDecision.d.ts"), "utf8"),
    /export type EnforceDecision/,
  );
});

test("broad quota runtime aliases stay retired", () => {
  const aliases = ["./quota/types", "./quota/scheduler", "./quota/spend-recorder"];
  for (const alias of aliases) assert.equal(manifest.exports[alias], undefined, alias);
  const retiredImport = /core-domain\/quota\/(?:types|scheduler|spend-recorder)(?=["'])/;
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), retiredImport, file);
    }
  }
});
