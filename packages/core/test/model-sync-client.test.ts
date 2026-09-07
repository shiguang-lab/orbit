import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildModelSyncInternalHeaders,
  createPinnedModelSyncTlsConnector,
  fetchModelSyncInternal,
  getModelSyncInternalAuthHeaderName,
  isModelSyncInternalRequest,
} from "@orbit/core/runtime/model-sync-client";

test("model-sync internal authentication accepts only its process token", () => {
  const headers = buildModelSyncInternalHeaders();
  const headerName = getModelSyncInternalAuthHeaderName();
  assert.equal(typeof headers[headerName], "string");
  assert.ok(headers[headerName].length > 0);
  assert.equal(isModelSyncInternalRequest({ headers: new Headers(headers) }), true);
  assert.equal(
    isModelSyncInternalRequest({ headers: new Headers({ [headerName]: "tampered" }) }),
    false
  );
  assert.equal(isModelSyncInternalRequest({ headers: new Headers() }), false);
});

test("pinned TLS connector forces the loopback address and localhost SNI", () => {
  let connectedOptions: Record<string, unknown> | null = null;
  const connect = ((options: Record<string, unknown>) => {
    connectedOptions = options;
  }) as never;
  const pinned = createPinnedModelSyncTlsConnector(connect);
  pinned({ hostname: "attacker.example", host: "attacker.example" } as never, (() => {}) as never);
  assert.equal(connectedOptions?.hostname, "127.0.0.1");
  assert.equal(connectedOptions?.host, "localhost");
  assert.equal(connectedOptions?.servername, "localhost");
});

test("internal fetch rejects a different origin before dispatch", async () => {
  await assert.rejects(
    fetchModelSyncInternal("https://attacker.example/api/providers/id/sync-models"),
    /must target the active dashboard listener/
  );
});
