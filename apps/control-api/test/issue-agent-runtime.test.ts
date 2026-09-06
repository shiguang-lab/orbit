import assert from "node:assert/strict";
import test from "node:test";

import { createRecordedTriageRun } from "../src/issue-agent/runtime/recorded-triage.ts";

test("control-owned Issue Agent creates a deterministic redacted triage run", () => {
  const run = createRecordedTriageRun({
    issueUrl: "https://github.com/acme/gateway/issues/42",
    recordedContext: {
      title: "Broken authorization",
      body: "Authorization: Bearer secret-token-value",
    },
  });

  assert.equal(run.repository, "acme/gateway");
  assert.equal(run.issueNumber, 42);
  assert.equal(run.context.intent, "bugfix");
  assert.equal(run.context.redactedDigestSource.includes("secret-token-value"), false);
  assert.match(run.context.redactedDigestSource, /\[REDACTED\]/);
});
