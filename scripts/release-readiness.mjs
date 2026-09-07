#!/usr/bin/env node

/**
 * Single strict release gate for an independent deployment.
 *
 * The gate intentionally fails when migration inputs are not supplied. A
 * green static audit alone must never be reported as a completed cutover.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const sourceData = process.env.ORBIT_SOURCE_DATA_DIR;
const targetData = process.env.ORBIT_TARGET_DATA_DIR;
const sourceHome = process.env.ORBIT_SOURCE_HOME_DIR;
const targetHome = process.env.ORBIT_TARGET_HOME_DIR;
const manifest = process.env.ORBIT_IMPORT_MANIFEST;
const runDeployment = process.env.RUN_DEPLOYMENT_SMOKE === "1";

const checks = [];
function run(label, script, args = [], env = {}) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", script), ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const passed = result.status === 0;
  checks.push({ label, status: passed ? "PASS" : "FAIL", exitCode: result.status ?? 1 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) process.stdout.write(`\n[${label}]\n${output}\n`);
  return passed;
}

function runCommand(label, command, args = [], env = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const passed = result.status === 0;
  checks.push({ label, status: passed ? "PASS" : "FAIL", exitCode: result.status ?? 1 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) process.stdout.write(`\n[${label}]\n${output}\n`);
  return passed;
}

runCommand("workspace-typecheck", "pnpm", ["typecheck"]);
runCommand("workspace-build", "pnpm", ["build"]);

run("source-independent", "audit-gateway-independence.mjs", ["--strict"]);
run("app-boundaries", "audit-app-boundaries.mjs", ["--strict"]);
run("package-boundaries", "audit-package-boundaries.mjs", ["--strict"]);
run("console-route-parity", "audit-console-routes.mjs", ["--strict"]);
run("route-contracts", "audit-route-contracts.mjs", ["--strict"]);

if (!sourceData || !targetData) {
  checks.push({ label: "data-snapshot-inputs", status: "FAIL", reason: "ORBIT_SOURCE_DATA_DIR and ORBIT_TARGET_DATA_DIR are required" });
} else {
  run("data-snapshot", "verify-imported-data.mjs", [sourceData, targetData]);
  // Provider overlays are intentionally applied to the staged target DB. The
  // release gate must inspect the exact DB that will be published, otherwise a
  // valid HTTPS endpoint supplied during import would be ignored and the gate
  // would fail forever against the untouched source snapshot.
  run("provider-config", "audit-provider-config.mjs", [targetData]);
}

if (!manifest || !targetHome) {
  checks.push({ label: "external-state-inputs", status: "FAIL", reason: "ORBIT_IMPORT_MANIFEST and ORBIT_TARGET_HOME_DIR are required" });
} else {
  // The source home is user-specific. A path that did not exist in the
  // source is not a migration loss (there was nothing to copy); the verifier
  // still fails on every copied-file hash/count mismatch. Operators that
  // require every optional credential to exist can run the verifier directly
  // with --require-all as an explicit policy.
  run("external-state", "verify-external-state.mjs", [manifest, targetHome]);
}

if (runDeployment) {
  if (!sourceData) checks.push({ label: "container-deployment", status: "FAIL", reason: "ORBIT_SOURCE_DATA_DIR is required" });
  else run("container-deployment", "smoke-container-deployment.mjs", [], { ORBIT_SOURCE_DATA_DIR: sourceData, ...(sourceHome ? { ORBIT_SOURCE_HOME_DIR: sourceHome } : {}) });
  if (!targetData) checks.push({ label: "provider-matrix", status: "FAIL", reason: "ORBIT_TARGET_DATA_DIR is required" });
  else run("provider-matrix", "smoke-provider-matrix.mjs", [], { ORBIT_SOURCE_DATA_DIR: targetData });
}

const failed = checks.filter((check) => check.status !== "PASS");
console.log(`\nrelease readiness: ${failed.length === 0 ? "PASS" : "FAIL"}`);
console.log(JSON.stringify({ checks, failed: failed.length }, null, 2));
if (failed.length) process.exitCode = 1;
