import assert from "node:assert/strict";
import { test } from "node:test";

import { partitionQuotaMonitors } from "../src/features/runtime/quota-monitors.ts";

test("runtime quota monitor partition keeps error and exhausted rows renderable", () => {
  const groups = partitionQuotaMonitors([
    { accountId: "acct-error", provider: "agy", window: "5h", status: "error" },
    {
      accountId: "acct-exhausted",
      provider: "volcengine-coding-plan",
      window: "5h",
      status: "exhausted",
    },
    { accountId: "acct-alert", provider: "codex", window: "7d", status: "alerting" },
    { accountId: "acct-ok", provider: "openai", window: "day", status: "ok" },
  ]);

  assert.deepEqual(groups.errors.map((monitor) => monitor.accountId), ["acct-error"]);
  assert.deepEqual(groups.exhausted.map((monitor) => monitor.accountId), ["acct-exhausted"]);
  assert.deepEqual(groups.alerting.map((monitor) => monitor.accountId), ["acct-alert"]);
});
