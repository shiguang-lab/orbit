import assert from "node:assert/strict";
import test from "node:test";

import { detectSupportedThinkingEfforts } from "../src/lib/providerModels/modelDiscovery.ts";

test("model discovery preserves native max and normalizes only extra to xhigh", () => {
  assert.deepEqual(
    detectSupportedThinkingEfforts({
      supported_reasoning_levels: [
        { effort: "max" },
        { effort: "extra" },
        { effort: "max" },
        { effort: "ultra" },
      ],
    }),
    ["max", "xhigh", "ultra"],
  );
});
