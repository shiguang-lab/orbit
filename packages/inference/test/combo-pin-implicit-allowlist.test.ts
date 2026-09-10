import assert from "node:assert/strict";
import test from "node:test";

import { comboPinAllowlist, implicitPinAllowlist } from "@orbit/core/routing/combo-steps";
import { resolveComboTargets } from "../src/services/combo/comboStructure.ts";
import { expandTargetsByFingerprints } from "../src/services/combo/fingerprintExpansion.ts";

test("pin-only combo steps acquire an implicit hard allowlist", () => {
  assert.deepEqual(implicitPinAllowlist(" account-1 ", null), ["account-1"]);
  assert.deepEqual(implicitPinAllowlist("account-1", []), ["account-1"]);
  assert.deepEqual(implicitPinAllowlist("account-1", ["account-1", "account-2"]), [
    "account-1",
    "account-2",
  ]);
  assert.equal(comboPinAllowlist(false, "account-1", null), null);

  const targets = resolveComboTargets(
    {
      name: "pinned",
      strategy: "priority",
      models: [{ kind: "model", model: "openai/gpt-4o", connectionId: "account-1" }],
    },
    null
  );
  assert.deepEqual(targets[0].allowedConnectionIds, ["account-1"]);
});

test("fingerprint expansion rewrites implicit and sibling composite allowlist ids", () => {
  const first = "connection-1|fp|fingerprint-a";
  const second = "connection-2|fp|fingerprint-b";
  const [target] = expandTargetsByFingerprints(
    [
      {
        kind: "model",
        stepId: "step-1",
        executionKey: "step-1",
        modelStr: "opencode/model",
        provider: "opencode",
        providerId: null,
        connectionId: first,
        allowedConnectionIds: [first, second],
        weight: 0,
        label: null,
      },
    ],
    new Map(),
    (entry) => entry.provider
  );
  assert.equal(target.connectionId, "connection-1");
  assert.deepEqual(target.allowedConnectionIds, ["connection-1", "connection-2"]);
});
