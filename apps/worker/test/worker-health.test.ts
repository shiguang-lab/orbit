import assert from "node:assert/strict";
import test from "node:test";
import {
  startWorkerJobCommandServer,
  stopWorkerJobCommandServer,
} from "../src/jobs/command-server.js";

test("worker health endpoint proves the command listener is alive", async () => {
  const previousPort = process.env.WORKER_COMMAND_PORT;
  const previousToken = process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN;
  process.env.WORKER_COMMAND_PORT = "0";
  process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN = "worker-health-test-token";
  const server = await startWorkerJobCommandServer();
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "worker" });
  } finally {
    await stopWorkerJobCommandServer(server);
    if (previousPort === undefined) delete process.env.WORKER_COMMAND_PORT;
    else process.env.WORKER_COMMAND_PORT = previousPort;
    if (previousToken === undefined) delete process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN;
    else process.env.SHIGUANG_GATEWAY_WORKER_COMMAND_TOKEN = previousToken;
  }
});
