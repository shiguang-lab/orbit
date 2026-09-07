import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { WebSocket } from "ws";

test("authenticated events cross a process boundary and reach dashboard subscribers once", async () => {
  const root = await mkdtemp(join(tmpdir(), "realtime-events-"));
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwksFile = join(root, "jwks.json");
  await writeFile(jwksFile, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: "events", alg: "RS256" }] }));
  const token = "realtime-event-service-token";
  Object.assign(process.env, { DATA_DIR: root, SQLITE_FILE: join(root, "storage.sqlite"),
    SG_IDENTITY_JWKS_FILE: jwksFile, SG_IDENTITY_AUDIENCE: "orbit-api", SG_IDENTITY_ENTITLEMENT: "orbit:access", ORBIT_INTERNAL_SERVICE_TOKEN: token });
  const { startLiveDashboardServer } = await import("../src/live-ws/live-server.js");
  const runtime = await startLiveDashboardServer(0, "127.0.0.1");
  const address = runtime.server.address();
  assert.ok(address && typeof address === "object");
  const endpoint = `http://127.0.0.1:${address.port}/__orbit_event`;
  const identity = await new SignJWT({ sid: "event-session", entitlements: ["orbit:access"], roles: [] })
    .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: "events" })
    .setIssuer("https://shiguanglab.com").setAudience("orbit-api").setSubject("event-test-user")
    .setIssuedAt().setNotBefore("0s").setExpirationTime("2m").sign(privateKey);
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/live-ws`, {
    origin: "http://127.0.0.1:8787", headers: { "x-sg-identity": identity },
  });
  const received: string[] = [];
  const expected = ["request.started", "combo.target.attempt", "credential.health.changed"];
  let finishEvents: () => void;
  const events = new Promise<void>((resolve) => { finishEvents = resolve; });
  const deadline = setTimeout(() => ws.terminate(), 10000);
  try {
    await new Promise<void>((resolve, reject) => {
      ws.once("error", reject);
      ws.once("open", () => ws.send(JSON.stringify({ type: "subscribe", channels: ["requests", "combo", "credentials"] })));
      ws.on("message", (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type === "welcome") resolve();
        if (message.type === "event") {
          received.push(message.event);
          if (received.length === expected.length) finishEvents();
        }
      });
      ws.once("close", () => reject(new Error("WebSocket closed before welcome")));
    });
    for (const provided of [undefined, "wrong-token"]) {
      const response = await fetch(endpoint, { method: "POST", headers: {
        "content-type": "application/json", ...(provided ? { "x-orbit-internal-service-token": provided } : {}),
      }, body: JSON.stringify({ event: expected[0], payload: {} }) });
      assert.equal(response.status, 403);
    }
    const publisherUrl = new URL("../../../packages/utils/src/realtime/index.ts", import.meta.url).href;
    await promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import { startRealtimePublisher } from ${JSON.stringify(publisherUrl)};
      let emit; const pending = []; const failures = [];
      const publisher = startRealtimePublisher({
        url: ${JSON.stringify(endpoint)},
        subscribe(listener) { emit = listener; return () => { emit = null; }; },
        headers() { return { 'x-orbit-internal-service-token': ${JSON.stringify(token)} }; },
        onError(error) { failures.push(error); },
        fetch(...args) { const response = fetch(...args); pending.push(response); return response; }
      });
      for (const event of ${JSON.stringify(expected)}) emit(event, { requestId: 'event-test' });
      while (pending.length < ${expected.length}) await new Promise(resolve => setTimeout(resolve, 10));
      const responses = await Promise.all(pending);
      if (responses.some(response => response.status !== 202)) throw new Error('event rejected');
      await publisher.close();
      if (emit !== null || failures.length) throw new Error('publisher delivery or cleanup failed');
    `], { timeout: 10000 });
    await Promise.race([events, new Promise((_, reject) => setTimeout(() => reject(new Error("Missing cross-process event")), 3000).unref())]);
    assert.deepEqual(received, expected);
  } finally {
    clearTimeout(deadline);
    ws.terminate();
    await runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});
