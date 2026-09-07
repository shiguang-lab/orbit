import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/orbit.mjs", import.meta.url));
const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
const expectedVersion = JSON.parse(readFileSync(packagePath, "utf8")).version;

const version = spawnSync(process.execPath, [cliPath, "--version"], { encoding: "utf8" });
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stdout.trim(), expectedVersion);

await import("../src/cli/program.mjs");
console.log("cli source closure smoke: PASS");
