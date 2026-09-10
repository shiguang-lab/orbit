import assert from "node:assert/strict";
import test from "node:test";

import {
  describeCapabilityFilterExhaustion,
  isVisionIncompatibleTarget,
} from "../src/services/combo/comboStructure.ts";
import type { ResolvedComboTarget } from "../src/services/combo/types.ts";
import { registerProviderRuntimePorts } from "../../core/src/runtime/providerRuntimePorts.ts";

registerProviderRuntimePorts({
  parseModel(model) {
    const value = typeof model === "string" ? model : "";
    const separator = value.indexOf("/");
    return {
      provider: separator > 0 ? value.slice(0, separator) : null,
      model: separator > 0 ? value.slice(separator + 1) : value || null,
      isAlias: false,
      providerAlias: separator > 0 ? value.slice(0, separator) : null,
      extendedContext: false,
    };
  },
  resolveCanonicalProviderModel: (provider, model) => ({
    provider: provider ?? null,
    model: model ?? null,
  }),
  getRegisteredProviderEffortBaseModelId: () => null,
});

function target(modelStr: string): ResolvedComboTarget {
  return {
    kind: "model",
    stepId: modelStr,
    executionKey: modelStr,
    modelStr,
    provider: "command-code",
    providerId: "command-code",
    connectionId: null,
    weight: 1,
    label: null,
  };
}

test("output-token exhaustion reports the requested tokens and highest known ceiling", () => {
  const exhaustion = describeCapabilityFilterExhaustion(
    [
      target("command-code/claude-opus-4-7"),
      target("command-code/claude-sonnet-4-6"),
    ],
    { messages: [{ role: "user", content: "hello" }], max_tokens: 100_000 },
    "writer"
  );

  assert.ok(exhaustion);
  assert.deepEqual(exhaustion.unmet, ["output_tokens"]);
  assert.equal(
    exhaustion.message,
    "No target in combo writer can produce the requested max_tokens=100000; the highest known output limit in the pool is 32000"
  );
  assert.doesNotMatch(exhaustion.message, /structured output/i);
  assert.equal(exhaustion.terminalReason, "capability_mismatch");
});

test("provider-aware capability lookup preserves namespaced vision model ids", () => {
  const nvidiaTarget: ResolvedComboTarget = {
    ...target("nvidia/nemotron-nano-12b-v2-vl"),
    provider: "nvidia",
    providerId: "nvidia",
  };

  assert.equal(
    isVisionIncompatibleTarget(nvidiaTarget, {
      requiresTools: false,
      requiresVision: true,
      requiresStructuredOutput: false,
      estimatedInputTokens: 10,
      requestedOutputTokens: 10,
      requiredContextTokens: 20,
    }),
    false
  );
});
