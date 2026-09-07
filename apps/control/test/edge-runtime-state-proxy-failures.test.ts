import assert from "node:assert/strict";
import test from "node:test";
import { GET as getProxyLogs } from "../src/logs/handlers/proxy-logs.handler.js";
import { MemoryService } from "../src/memory/memory.service.js";

test("edge-owned proxy log and memory failures remain explicit", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "edge unavailable" }, { status: 503 });
  try {
    const proxyResponse = await getProxyLogs(new Request("http://localhost/api/usage/proxy-logs"));
    assert.equal(proxyResponse.status, 500);
    assert.deepEqual(await proxyResponse.json(), {
      error: { message: "edge unavailable", type: "server_error" },
    });

    await assert.rejects(() => new MemoryService().engineStatus(), /edge unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
