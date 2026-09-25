import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseQuotaData,
  hasFixedQuotaOrder,
  getAntigravityModelRank,
  sortQuotasDeterministically,
} from "../src/features/quota/quotaParsing.ts";

test("hasFixedQuotaOrder recognizes antigravity and agy", () => {
  assert.equal(hasFixedQuotaOrder("antigravity"), true);
  assert.equal(hasFixedQuotaOrder("agy"), true);
  assert.equal(hasFixedQuotaOrder("codex"), true);
  assert.equal(hasFixedQuotaOrder("glm"), true);
});

test("getAntigravityModelRank assigns priority to flagship models", () => {
  assert.equal(getAntigravityModelRank("credits"), 0);
  assert.equal(getAntigravityModelRank("claude_opus_4_6_thinking"), 10);
  assert.equal(getAntigravityModelRank("claude-sonnet-4-6"), 11);
  assert.equal(getAntigravityModelRank("gemini_3_1_pro_low"), 20);
  assert.equal(getAntigravityModelRank("gemini-3.1-pro-high"), 21);
  assert.equal(getAntigravityModelRank("gemini_pro_agent"), 21);
  assert.equal(getAntigravityModelRank("gemini_3_8_flash"), 30);
  assert.equal(getAntigravityModelRank("gemini-3.7-flash-tiered"), 31);
  assert.equal(getAntigravityModelRank("gemini_3_6_flash"), 32);
  assert.equal(getAntigravityModelRank("gemini-3.1-flash-lite"), 33);
  assert.equal(getAntigravityModelRank("gemini_3_1_flash_image"), 34);
  assert.equal(getAntigravityModelRank("gpt_oss_120b_medium"), 40);
});

test("parseQuotaData stably sorts Antigravity/Agy models in flagship order", () => {
  // Scrambled input order simulating non-deterministic upstream response
  const scrambledData = {
    quotas: {
      gemini_3_1_flash_image: { used: 0, total: 1000, remainingPercentage: 100 },
      gpt_oss_120b_medium: { used: 0, total: 1000, remainingPercentage: 100 },
      gemini_3_1_pro_low: { used: 0, total: 1000, remainingPercentage: 100 },
      gemini_3_7_flash_tiered: { used: 0, total: 1000, remainingPercentage: 100 },
      claude_opus_4_6_thinking: { used: 0, total: 1000, remainingPercentage: 100 },
      gemini_pro_agent: { used: 0, total: 1000, remainingPercentage: 100 },
      credits: { used: 0, total: 0, remaining: 15 },
    },
  };

  const parsed = parseQuotaData("agy", scrambledData);
  const names = parsed.map((q) => q.name);

  // Expected order:
  // 1. credits (rank 0)
  // 2. claude_opus_4_6_thinking (rank 10)
  // 3. gemini_3_1_pro_low (rank 20)
  // 4. gemini_pro_agent (rank 21)
  // 5. gemini_3_7_flash_tiered (rank 31)
  // 6. gemini_3_1_flash_image (rank 34)
  // 7. gpt_oss_120b_medium (rank 40)
  assert.deepEqual(names, [
    "credits",
    "claude_opus_4_6_thinking",
    "gemini_3_1_pro_low",
    "gemini_pro_agent",
    "gemini_3_7_flash_tiered",
    "gemini_3_1_flash_image",
    "gpt_oss_120b_medium",
  ]);
});

test("sortQuotasDeterministically preserves window order for canonical window providers and sorts models for agy", () => {
  const windowQuotas = [
    { name: "weekly", remainingPercentage: 80 },
    { name: "session", remainingPercentage: 50 },
  ];
  const sortedWindows = sortQuotasDeterministically(windowQuotas, "codex");
  assert.equal(sortedWindows[0].name, "session");
  assert.equal(sortedWindows[1].name, "weekly");

  const agyQuotas = [
    { name: "gpt_oss_120b_medium" },
    { name: "claude_opus_4_6_thinking" },
  ];
  const sortedAgy = sortQuotasDeterministically(agyQuotas, "agy");
  assert.equal(sortedAgy[0].name, "claude_opus_4_6_thinking");
  assert.equal(sortedAgy[1].name, "gpt_oss_120b_medium");
});
