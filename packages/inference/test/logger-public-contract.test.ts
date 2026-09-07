import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as loggerRuntime from "../src/utils/logger.js";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");

test("logger public runtime and declaration expose the same exact keys", () => {
  assert.deepEqual(Object.keys(loggerRuntime).sort(), [
    "createLogger",
    "default",
    "defaultLogger",
    "generateRequestId",
    "log",
    "logger",
    "maskKey",
  ]);
  const declaration = fs.readFileSync(path.join(packageRoot, "src/public/logger.d.ts"), "utf8");
  for (const ghost of ["error", "info", "warn", "debug"]) {
    assert.doesNotMatch(declaration, new RegExp(`export function ${ghost}\\b`));
  }
});

test("workspace consumers use the real log object instead of ghost namespace methods", () => {
  for (const relativePath of [
    "apps/control-api/src/search/providers/handlers/search-providers.handler.ts",
    "apps/edge-gateway/src/rerank/provider-handler.ts",
  ]) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(source, /import \{ log \} from "@orbit\/inference\/utils\/logger"/);
    assert.doesNotMatch(source, /import \* as log/);
  }
});
