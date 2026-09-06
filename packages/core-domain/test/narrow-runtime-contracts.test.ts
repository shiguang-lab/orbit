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
  "./shared/body-size-guard": {
    types: "./src/public/bodySizeGuard.d.ts",
    entry: "./src/shared/bodySizeGuard.ts",
    keys: ["RequestBodyTooLargeError", "getBodySizeLimit", "readRequestBodyWithLimit"],
  },
  "./catalog/model-metadata": {
    types: "./src/public/catalogModelMetadata.d.ts",
    entry: "./src/catalog/modelMetadata.ts",
    keys: ["getCanonicalModelMetadata"],
  },
  "./runtime/provider-settings-port": {
    types: "./src/public/providerRuntimeSettingsPort.d.ts",
    entry: "./src/runtime/providerSettingsPort.ts",
    keys: ["applyProviderModelAliases", "registerProviderRuntimeSettingsPort"],
  },
} as const;

test("shared runtime contracts expose only their consumed keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], { types: contract.types, import: contract.entry });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
  }
});

test("narrow declarations re-export the same public symbols from their implementations", () => {
  for (const contract of Object.values(contracts)) {
    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    for (const key of contract.keys) assert.match(declaration, new RegExp(`\\b${key}\\b`), key);
  }
});
