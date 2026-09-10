import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  isClientAbortError,
  shouldSwallowUncaught,
} from "../src/shared/utils/httpClientAbortGuard.mjs";

const guardPath = fileURLToPath(
  new URL("../src/shared/utils/httpClientAbortGuard.mjs", import.meta.url)
);

function runChild(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script, guardPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.on("error", reject);
  });
}

test("AbortError with an abort-flavoured message is a client abort", () => {
  const sseAbort = Object.assign(new Error("request_signal_aborted"), { name: "AbortError" });
  assert.equal(isClientAbortError(sseAbort), true);
  assert.equal(isClientAbortError(new DOMException("This operation was aborted", "AbortError")), true);
  assert.equal(
    isClientAbortError(new TypeError("Cannot read properties of undefined (reading 'abort')")),
    false
  );
  assert.equal(shouldSwallowUncaught(sseAbort, "unhandledRejection"), true);
});

test("production crash guard survives routine SSE aborts", async () => {
  const result = await runChild(`
    const { installProcessCrashGuard } = await import(process.argv[1]);
    installProcessCrashGuard(() => {});
    process.emit("unhandledRejection", Object.assign(new Error("request_signal_aborted"), { name: "AbortError" }), Promise.resolve());
    console.log("ALIVE");
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ALIVE/);
});

test("production crash guard retains crash semantics for genuine errors", async () => {
  const result = await runChild(`
    const { installProcessCrashGuard } = await import(process.argv[1]);
    installProcessCrashGuard(() => {});
    process.emit("uncaughtException", new Error("genuine failure"), "uncaughtException");
    console.log("SHOULD_NOT_REACH");
  `);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /SHOULD_NOT_REACH/);
});
