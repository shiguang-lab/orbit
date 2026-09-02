import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveNasProxyTimeoutMs } from "../src/lib/nasProxy.js";

test("keeps the normal NAS API timeout for ordinary requests", () => {
  assert.equal(resolveNasProxyTimeoutMs("/api/providers", "30000"), 30_000);
});

test("allows at least five minutes for embedded-service installs and updates", () => {
  assert.equal(resolveNasProxyTimeoutMs("/api/services/cliproxy/install", "30000"), 300_000);
  assert.equal(resolveNasProxyTimeoutMs("/api/services/cliproxy/update", "30000"), 300_000);
  assert.equal(resolveNasProxyTimeoutMs("/api/version-manager/install", "30000"), 300_000);
});

test("preserves a longer operator-configured timeout", () => {
  assert.equal(resolveNasProxyTimeoutMs("/api/services/cliproxy/install", "600000"), 600_000);
});
