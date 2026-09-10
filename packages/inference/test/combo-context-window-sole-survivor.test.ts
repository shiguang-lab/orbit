import assert from "node:assert/strict";
import test from "node:test";

import type { ResolvedComboTarget } from "../src/services/combo/types.ts";

const { installRuntimePorts } = await import("../src/services/dbRuntimeHooks.ts");
installRuntimePorts();
const { filterTargetsByRequestCompatibility } = await import(
  "../src/services/combo/comboStructure.ts"
);

function target(modelStr: string): ResolvedComboTarget {
  const slash = modelStr.indexOf("/");
  const provider = modelStr.slice(0, slash);
  return {
    kind: "model",
    stepId: modelStr,
    executionKey: modelStr,
    modelStr,
    provider,
    providerId: provider,
    connectionId: null,
    weight: 1,
    label: null,
  };
}

const log = { info() {}, warn() {}, debug() {} };

test("known-too-small sole survivor restores hard-rejected non-vision targets", () => {
  const targets = [target("openai/o3"), target("veoaifree-web/veo")];
  const body = {
    messages: [{ role: "user", content: "x".repeat(1_000_000) }],
    tools: [{ type: "function", function: { name: "run", parameters: {} } }],
  };
  assert.deepEqual(
    filterTargetsByRequestCompatibility(targets, body, log).map((entry) => entry.modelStr),
    targets.map((entry) => entry.modelStr)
  );
});

test("known-fitting sole survivor remains collapsed", () => {
  const targets = [target("openai/o3"), target("veoaifree-web/veo")];
  const body = {
    messages: [{ role: "user", content: "small" }],
    tools: [{ type: "function", function: { name: "run", parameters: {} } }],
  };
  assert.deepEqual(
    filterTargetsByRequestCompatibility(targets, body, log).map((entry) => entry.modelStr),
    ["openai/o3"]
  );
});

test("unknown-context sole survivor does not restore hard-rejected targets", () => {
  const targets = [target("unknown-provider/mystery"), target("openai/gpt-5.6-sol")];
  const body = {
    messages: [{ role: "user", content: "small" }],
    max_tokens: 500_000,
  };
  assert.deepEqual(
    filterTargetsByRequestCompatibility(targets, body, log).map((entry) => entry.modelStr),
    ["unknown-provider/mystery"]
  );
});
