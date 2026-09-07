import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { startRealtimePublisher } from "../src/index.js";

test("publishes authenticated event envelopes and treats HTTP rejection as failure", async () => {
  const errors: unknown[] = [];
  const requests: Array<{ token: string | string[] | undefined; body: unknown }> = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({ token: req.headers["x-shiguang-gateway-internal-service-token"], body: JSON.parse(body) });
    res.writeHead(requests.length === 1 ? 202 : 403).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  let listener!: (event: string, payload: unknown) => void;
  let subscribed = true;
  const publisher = startRealtimePublisher({
    url: `http://127.0.0.1:${address.port}/events`,
    subscribe: (callback) => { listener = callback; return () => { subscribed = false; }; },
    headers: () => ({ "x-shiguang-gateway-internal-service-token": "test-token" }),
    onError: (error) => errors.push(error),
  });
  try {
    listener("request.started", { requestId: "request-1" });
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 3000;
      const timer = setInterval(() => {
        if (requests.length) { clearInterval(timer); resolve(); }
        else if (Date.now() > deadline) { clearInterval(timer); reject(new Error("event not delivered")); }
      }, 10);
    });
    listener("credential.health.changed", { connectionId: "connection-1" });
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 3000;
      const timer = setInterval(() => {
        if (errors.length) { clearInterval(timer); resolve(); }
        else if (Date.now() > deadline) { clearInterval(timer); reject(new Error("HTTP rejection not reported")); }
      }, 10);
    });
    assert.equal(requests[0].token, "test-token");
    assert.deepEqual((requests[0].body as { payload: unknown }).payload, { requestId: "request-1" });
    assert.match(String(errors[0]), /403/);
    await publisher.close();
    assert.equal(subscribed, false);
    listener("request.started", {});
    assert.equal(requests.length, 2);
  } finally {
    await publisher.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("close unsubscribes and aborts pending delivery without reporting shutdown as a failure", async () => {
  let listener!: (event: string, payload: unknown) => void;
  let signal: AbortSignal | undefined;
  let unsubscribed = 0;
  const errors: unknown[] = [];
  const publisher = startRealtimePublisher({
    url: "http://realtime/events",
    subscribe: (callback) => { listener = callback; return () => { unsubscribed++; }; },
    headers: () => ({}), onError: (error) => errors.push(error),
    fetch: (async (_url, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    }) as typeof fetch,
  });
  listener("combo.target.attempt", {});
  await Promise.resolve();
  await Promise.all([publisher.close(), publisher.close()]);
  assert.equal(signal?.aborted, true);
  assert.equal(unsubscribed, 1);
  assert.equal(errors.length, 0);
});

test("an unconfigured transport does not subscribe", async () => {
  const publisher = startRealtimePublisher({
    subscribe: () => { throw new Error("must not subscribe"); },
    headers: () => ({}), onError: () => {},
  });
  await publisher.close();
});
