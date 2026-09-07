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
    subpath: "./db/detailed-logs",
    types: "./src/public/detailedLogs.d.ts",
    implementation: "./src/db/detailedLogs.ts",
    keys: ["getRequestDetailLogCount", "getRequestDetailLogs", "isDetailedLoggingEnabled"],
  },
  {
    subpath: "./db/proxy-logs",
    types: "./src/public/proxyLogs.d.ts",
    implementation: "./src/db/proxyLogs.ts",
    keys: [
      "EGRESS_IP_LOOKUP_WINDOW_MS",
      "exportProxyLogsSince",
      "getRecentEgressIpForConnection",
    ],
  },
] as const;
const retiredAliases = ["./runtime/detailed-logs", "./runtime/proxy-logs"] as const;

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

test("detailed and proxy log persistence contracts expose consumed runtime keys", async () => {
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

test("runtime log persistence aliases stay retired", () => {
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
