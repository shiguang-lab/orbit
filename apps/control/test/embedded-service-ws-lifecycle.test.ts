import assert from "node:assert/strict";
import test from "node:test";

import {
  initEmbedWsProxy,
  stopEmbedWsProxy,
} from "../src/services/embedded-service-ws-proxy.ts";

test("embedded WebSocket proxy has idempotent app-owned startup and shutdown", async () => {
  const previousHost = process.env.EMBED_WS_PROXY_HOST;
  const previousPort = process.env.EMBED_WS_PROXY_PORT;
  process.env.EMBED_WS_PROXY_HOST = "127.0.0.1";
  process.env.EMBED_WS_PROXY_PORT = "0";

  try {
    const first = initEmbedWsProxy();
    const second = initEmbedWsProxy();
    assert.strictEqual(first, second);

    const server = await first;
    assert.equal(server.listening, true);
    assert.equal(globalThis.__orbitEmbedWsStarted, true);

    await stopEmbedWsProxy();
    assert.equal(server.listening, false);
    assert.equal(globalThis.__orbitEmbedWsStarted, false);

    const restartedServer = await initEmbedWsProxy();
    assert.notStrictEqual(restartedServer, server);
    assert.equal(restartedServer.listening, true);

    await stopEmbedWsProxy();
    assert.equal(restartedServer.listening, false);
    assert.equal(globalThis.__orbitEmbedWsStarted, false);

    await stopEmbedWsProxy();
  } finally {
    await stopEmbedWsProxy();
    if (previousHost === undefined) delete process.env.EMBED_WS_PROXY_HOST;
    else process.env.EMBED_WS_PROXY_HOST = previousHost;
    if (previousPort === undefined) delete process.env.EMBED_WS_PROXY_PORT;
    else process.env.EMBED_WS_PROXY_PORT = previousPort;
  }
});
