/**
 * Regression for #12417 (inference side) — the Copilot CLI fingerprint UA must
 * follow GITHUB_COPILOT_CLI_VERSION at call time while the captured-pin const
 * stays fixed for lockstep tests.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { applyFingerprint } from "../src/config/cliFingerprints.ts";
import * as copilot from "@orbit/providers/support/config/providerHeaderProfiles";

async function withEnv<T>(
  entries: Record<string, string | undefined>,
  fn: () => T | Promise<T>
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(entries)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("#12417 applyFingerprint Copilot UA follows the env, pin const does not", async () => {
  await withEnv({ GITHUB_COPILOT_CLI_VERSION: "1.0.82" }, () => {
    const result = applyFingerprint(
      "copilot",
      { Authorization: "Bearer token", Accept: "application/json" },
      { model: "gpt-4o", messages: [] }
    );
    assert.equal(result.headers["User-Agent"], "GitHubCopilotChat/1.0.82");
    assert.equal(copilot.GITHUB_COPILOT_CHAT_USER_AGENT, "GitHubCopilotChat/1.0.81-6");
  });
});
