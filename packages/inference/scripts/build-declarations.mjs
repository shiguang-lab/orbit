import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(packageDir, "dist", "types");
const require = createRequire(import.meta.url);
const tsc = require.resolve("typescript/bin/tsc");

// Declarations are generated artifacts. Rebuild from an empty, package-scoped
// directory so removed source entrypoints cannot leave stale public types.
rmSync(outputDir, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [tsc, "-p", join(packageDir, "tsconfig.build.json"), "--pretty", "false"],
  { cwd: packageDir, stdio: "inherit" }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
