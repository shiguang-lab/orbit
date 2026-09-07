import assert from "node:assert/strict";
import test from "node:test";
import { parseJobCommand } from "@orbit/contracts/job-command";
import { executeWorkerJobCommand, type WorkerJobCommandRegistry } from "../src/jobs/command-server.js";

test("job command contract rejects unversioned and malformed commands", () => {
  assert.equal(parseJobCommand({ command: "run-now", jobId: "cleanup" }), null);
  assert.equal(parseJobCommand({ version: 2, command: "run-now", jobId: "cleanup" }), null);
  assert.equal(parseJobCommand({ version: 1, command: "set-enabled", jobId: "cleanup" }), null);
  assert.deepEqual(parseJobCommand({ version: 1, command: "run-now", jobId: "cleanup" }), {
    version: 1, command: "run-now", jobId: "cleanup",
  });
});

test("worker command reports non-started jobs as failures", async () => {
  const registry: WorkerJobCommandRegistry = {
    hasHandler: () => true,
    listJobs: () => [{ id: "cleanup", enabled: false }],
    setEnabled: () => undefined,
    runNow: async () => ({ started: false, reason: "disabled" }),
  };
  const result = await executeWorkerJobCommand({ version: 1, command: "run-now", jobId: "cleanup" }, registry);
  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { version: 1, success: false, code: "disabled", message: "Job was not started: disabled" });
});

test("worker refuses to enable a job without a local handler", async () => {
  let toggled = false;
  const registry: WorkerJobCommandRegistry = {
    hasHandler: () => false,
    listJobs: () => [{ id: "cleanup", enabled: false }],
    setEnabled: () => { toggled = true; },
    runNow: async () => ({ started: true }),
  };
  const result = await executeWorkerJobCommand({ version: 1, command: "set-enabled", jobId: "cleanup", enabled: true }, registry);
  assert.equal(result.status, 409);
  assert.equal(toggled, false);
});
