import assert from "node:assert/strict";
import test from "node:test";
import {
  ROUTING_STRATEGIES,
  ROUTING_STRATEGY_VALUES,
  normalizeRoutingStrategy,
} from "@orbit/contracts/routing-strategies";
import { getResetAwareRemainingPercent } from "../src/services/combo/quotaScoring.js";
import { pickWeightedIndex } from "../src/services/combo/quotaStrategies.js";

test("quota-weighted is a public normalized routing strategy", () => {
  assert.ok(ROUTING_STRATEGY_VALUES.includes("quota-weighted"));
  assert.equal(normalizeRoutingStrategy(" QUOTA-WEIGHTED "), "quota-weighted");
  assert.equal(
    ROUTING_STRATEGIES.find((strategy) => strategy.value === "quota-weighted")?.labelKey,
    "quotaWeighted",
  );
});

test("weighted draw skips zero weights and uses half-open cumulative ranges", () => {
  assert.equal(pickWeightedIndex([0, 2, 3], 0), 1);
  assert.equal(pickWeightedIndex([0, 2, 3], 1.999), 1);
  assert.equal(pickWeightedIndex([0, 2, 3], 2), 2);
  assert.equal(pickWeightedIndex([0, 0], 0), null);
});

test("remaining percent uses the most depleted reset-aware window", () => {
  assert.equal(
    getResetAwareRemainingPercent({
      window5h: { percentUsed: 0.25 },
      window7d: { percentUsed: 0.8 },
    }),
    20,
  );
  assert.equal(getResetAwareRemainingPercent({ limitReached: true, percentUsed: 0 }), 0);
  assert.equal(getResetAwareRemainingPercent(null), 100);
});
