import assert from "node:assert/strict";
import test from "node:test";

import { resolveStreamReadinessTimeout } from "../src/utils/streamReadinessPolicy.ts";

const messages = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ role: "user", content: String(index) }));

test("extended-thinking aliases receive a provider-independent readiness allowance", () => {
  const result = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "kiro",
    model: "claude-sonnet-5-thinking",
    body: { messages: messages(401) },
  });
  assert.equal(result.timeoutMs, 155_000);
  assert.ok(result.reasons.includes("extended_thinking"));

  const qualified = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "devin",
    model: "claude-opus-4-6-thinking-1m",
    body: { messages: messages(2) },
  });
  assert.equal(qualified.timeoutMs, 110_000);
});

test("extended-thinking does not stack with Claude-format or Codex high reasoning", () => {
  const claudeReplica = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "agentrouter",
    model: "claude-sonnet-4-6-thinking",
    body: { messages: messages(2) },
  });
  assert.equal(claudeReplica.timeoutMs, 110_000);
  assert.ok(!claudeReplica.reasons.includes("claude_format_heavy_reasoning"));

  const codex = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "codex",
    model: "gpt-5.5-thinking",
    body: { messages: messages(2), reasoning_effort: "high" },
  });
  assert.equal(codex.timeoutMs, 110_000);
  assert.ok(codex.reasons.includes("codex_gpt_5_5_high_reasoning"));
  assert.ok(!codex.reasons.includes("extended_thinking"));
});

test("unrelated model ids containing thinking do not receive the allowance", () => {
  const result = resolveStreamReadinessTimeout({
    baseTimeoutMs: 80_000,
    provider: "openai",
    model: "thinking-machines-lab-model",
    body: { messages: messages(2) },
  });
  assert.equal(result.timeoutMs, 80_000);
  assert.deepEqual(result.reasons, ["base"]);
});
