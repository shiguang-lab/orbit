import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildClaudeDiscoverySettingsSnippet,
  getStoredClaudeAuthValue,
  normalizeClaudeBaseUrl,
} from "../src/cli-tools/claude-cli-config.js";

test("normalizes surrounding whitespace and every trailing slash", () => {
  assert.equal(normalizeClaudeBaseUrl("  https://gateway.example/v1///  "), "https://gateway.example/v1");
  assert.equal(normalizeClaudeBaseUrl(""), "");
});

test("builds the exact discovery settings fragment and floors a valid context window", () => {
  assert.equal(buildClaudeDiscoverySettingsSnippet({
    baseUrl: " https://gateway.example/// ",
    apiKeyPlaceholder: "${ORBIT_API_KEY}",
    autoCompactWindow: 128000.9,
  }), JSON.stringify({
    env: {
      ANTHROPIC_BASE_URL: "https://gateway.example",
      ANTHROPIC_AUTH_TOKEN: "${ORBIT_API_KEY}",
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1",
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: "128000",
    },
  }, null, 2));
});

test("omits absent, non-finite, and non-positive auto-compaction windows", () => {
  for (const autoCompactWindow of [undefined, Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
    const parsed = JSON.parse(buildClaudeDiscoverySettingsSnippet({
      baseUrl: "https://gateway.example",
      apiKeyPlaceholder: "placeholder",
      autoCompactWindow,
    }));
    assert.equal("CLAUDE_CODE_AUTO_COMPACT_WINDOW" in parsed.env, false);
  }
});

test("reads the auth token first, falls back to API key, and rejects blank or non-string values", () => {
  assert.equal(getStoredClaudeAuthValue({ ANTHROPIC_AUTH_TOKEN: " token ", ANTHROPIC_API_KEY: "key" }), "token");
  assert.equal(getStoredClaudeAuthValue({ ANTHROPIC_API_KEY: " key " }), "key");
  assert.equal(getStoredClaudeAuthValue({ ANTHROPIC_AUTH_TOKEN: "   ", ANTHROPIC_API_KEY: "key" }), null);
  assert.equal(getStoredClaudeAuthValue({ ANTHROPIC_AUTH_TOKEN: 42 }), null);
  assert.equal(getStoredClaudeAuthValue(null), null);
});
