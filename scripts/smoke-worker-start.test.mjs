import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { stopProcessGroup } from "./smoke-worker-start.mjs";

test("stopProcessGroup terminates descendants that keep stdio open", { skip: process.platform === "win32" }, async () => {
  const descendantSource = [
    "process.on('SIGTERM', () => {});",
    "setTimeout(() => {}, 20_000);",
  ].join(" ");
  const parentSource = [
    "import { spawn } from 'node:child_process';",
    `spawn(process.execPath, ['--input-type=module', '-e', ${JSON.stringify(descendantSource)}], { stdio: ['ignore', 'inherit', 'ignore'] });`,
    "process.stdout.write('ready\\n');",
    "process.on('SIGTERM', () => process.exit(0));",
  ].join(" ");
  const child = spawn(process.execPath, ["--input-type=module", "-e", parentSource], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let ready = "";
  child.stdout.on("data", (chunk) => { ready += String(chunk); });
  child.stderr.on("data", () => {});
  const closed = new Promise((resolve) => child.once("close", resolve));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("fixture did not start")), 2_000);
    const poll = () => ready.includes("ready") ? (clearTimeout(timer), resolve()) : setTimeout(poll, 10);
    poll();
  });
  const startedAt = Date.now();
  await stopProcessGroup({ child, closed }, { termTimeoutMs: 50, killTimeoutMs: 1_000 });
  assert.ok(Date.now() - startedAt < 1_500, "cleanup exceeded its bounded deadline");
  assert.notEqual(child.exitCode, null);
});
