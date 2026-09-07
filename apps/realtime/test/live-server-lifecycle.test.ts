import assert from "node:assert/strict";
import { test } from "node:test";
import { startLiveDashboardServer } from "../src/live-ws/live-server.js";

test("live WebSocket runtime closes idempotently and releases its listener", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "realtime-lifecycle-test-secret";
  try {
    const first = await startLiveDashboardServer(0, "127.0.0.1");
    const address = first.server.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;

    await Promise.all([first.close(), first.close()]);
    assert.equal(first.server.listening, false);

    const restarted = await startLiveDashboardServer(port, "127.0.0.1");
    await restarted.close();
    assert.equal(restarted.server.listening, false);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
