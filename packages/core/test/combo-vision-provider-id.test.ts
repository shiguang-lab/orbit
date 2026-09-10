import assert from "node:assert/strict";
import test from "node:test";

const { registerProviderRuntimePorts } = await import("../src/runtime/providerRuntimePorts.ts");
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

const { getComboVisionBridgeDecision } = await import(
  "../src/lib/guardrails/visionBridge.ts"
);
const { createCombo } = await import("../src/lib/db/combos.ts");
const { resetDbInstance } = await import("../src/lib/db/core.ts");

test.after(() => resetDbInstance());

test("combo vision decision uses providerId for namespaced provider model ids", async () => {
  const comboName = `nvidia-vision-${Date.now()}`;
  await createCombo({
    name: comboName,
    strategy: "priority",
    models: [
      {
        kind: "model",
        providerId: "nvidia",
        model: "nvidia/nemotron-nano-12b-v2-vl",
        weight: 1,
      },
    ],
  });

  const decision = await getComboVisionBridgeDecision(comboName);
  assert.equal(decision, "skip");
});
