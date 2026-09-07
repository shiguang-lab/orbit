import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string }>;
};

const contracts = {
  "./control/cursor-token-extractor": {
    types: "./src/public/cursorTokenExtractor.d.ts",
    entry: "./src/control/cursorTokenExtractor.ts",
    keys: ["tryAgentAuth", "tryIdeAuth"],
  },
  "./plugins/db": {
    types: "./src/public/pluginsDb.d.ts",
    entry: "./src/plugins/db.ts",
    keys: ["getPluginAnalytics", "getPluginAnalyticsSummary", "getPluginByName", "listPlugins", "updatePluginConfig"],
  },
  "./db/encryption": {
    types: "./src/public/encryption.d.ts",
    entry: "./src/db/encryption.ts",
    keys: ["decrypt", "encrypt", "isEncryptionEnabled"],
  },
} as const;

test("cursor auth, plugin DB, and encryption contracts expose exact consumed runtime keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], { types: contract.types, import: contract.entry });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    for (const key of contract.keys) assert.match(declaration, new RegExp(`\\b${key}\\b`), key);
  }
});

test("wide implementation modules are not direct package runtime targets", () => {
  const runtimeTargets = Object.values(manifest.exports).map((entry) => entry.import);
  for (const retiredTarget of [
    "./src/lib/cursor/tokenExtractor.ts",
    "./src/lib/db/plugins.ts",
    "./src/lib/db/encryption.ts",
  ]) {
    assert.equal(runtimeTargets.includes(retiredTarget), false, retiredTarget);
  }
});
