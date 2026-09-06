#!/usr/bin/env node

/** Compile and execute the db-schema catalog's internal consistency guard. */
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDir = mkdtempSync(join(os.tmpdir(), "shiguang-db-schema-"));
try {
  const compile = spawnSync(
    "pnpm",
    [
      "--filter",
      "@shiguang-gateway/db-schema",
      "exec",
      "tsc",
      "--outDir",
      outputDir,
      "--declaration",
      "false",
      "--declarationMap",
      "false",
      "--sourceMap",
      "false",
    ],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (compile.status !== 0) process.exit(compile.status ?? 1);

  const { assertGatewayEntities } = await import(pathToFileURL(join(outputDir, "index.js")).href);
  assertGatewayEntities();
  console.log("db-schema entity catalog: PASS");
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}

