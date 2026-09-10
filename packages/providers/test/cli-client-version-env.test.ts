/**
 * Regression for #12417 — Anthropic gates models on the advertised Claude Code
 * client version. Codex already has CODEX_CLIENT_VERSION; Claude and Copilot
 * did not. A CLAUDE_USER_AGENT override is not enough: billing (`cc_version=`),
 * stainless headers, and the identity aliases all read the captured pin.
 *
 * Env override must be a safe token (same shape as Codex). Garbage is ignored.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  CLAUDE_CODE_CLIENT_BUILD_REVISION,
  getClaudeCodeClientBillingVersion,
  getClaudeCodeClientVersion,
  getClaudeCodeUserAgent,
} from "@orbit/contracts/claude-code-client";
import * as canonical from "@orbit/contracts/claude-code-client";
import * as copilot from "../src/config/providerHeaderProfiles.ts";
import * as hdr from "../src/config/anthropicHeaders.ts";
import { getClaudeCliHeaders } from "../src/config/providers/shared.ts";

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

test("#12417 Claude pin stays the captured 2.1.220 binary", () => {
  assert.equal(canonical.CLAUDE_CODE_CLIENT_VERSION, "2.1.220");
});

test("#12417 getClaudeCodeClientVersion falls back to the captured pin", async () => {
  await withEnv({ CLAUDE_CODE_CLIENT_VERSION: undefined }, () => {
    assert.equal(getClaudeCodeClientVersion(), canonical.CLAUDE_CODE_CLIENT_VERSION);
  });
});

test("#12417 getClaudeCodeClientVersion honors a safe env override", async () => {
  await withEnv({ CLAUDE_CODE_CLIENT_VERSION: "2.1.259" }, () => {
    assert.equal(getClaudeCodeClientVersion(), "2.1.259");
    assert.equal(getClaudeCodeUserAgent("cli"), "claude-cli/2.1.259 (external, cli)");
    assert.equal(getClaudeCodeUserAgent("sdk-cli"), "claude-cli/2.1.259 (external, sdk-cli)");
    assert.equal(
      getClaudeCodeClientBillingVersion(),
      `2.1.259.${CLAUDE_CODE_CLIENT_BUILD_REVISION}`
    );
  });
});

test("#12417 getClaudeCodeClientVersion ignores an unsafe env override", async () => {
  await withEnv({ CLAUDE_CODE_CLIENT_VERSION: "bad version value" }, () => {
    assert.equal(getClaudeCodeClientVersion(), canonical.CLAUDE_CODE_CLIENT_VERSION);
  });
});

test("#12417 Copilot pin stays the captured 1.0.81-6 CLI", () => {
  assert.equal(copilot.GITHUB_COPILOT_CLI_VERSION, "1.0.81-6");
});

test("#12417 getGitHubCopilotCliVersion falls back to the captured pin", async () => {
  await withEnv({ GITHUB_COPILOT_CLI_VERSION: undefined }, () => {
    assert.equal(copilot.getGitHubCopilotCliVersion(), copilot.GITHUB_COPILOT_CLI_VERSION);
  });
});

test("#12417 getGitHubCopilotChatHeaders honors a safe env override", async () => {
  await withEnv({ GITHUB_COPILOT_CLI_VERSION: "1.0.82" }, () => {
    assert.equal(copilot.getGitHubCopilotCliVersion(), "1.0.82");
    const headers = copilot.getGitHubCopilotChatHeaders();
    assert.equal(headers["user-agent"], "copilot/1.0.82");
    assert.equal(headers["editor-version"], "copilot/1.0.82");
  });
});

test("#12417 getGitHubCopilotCliVersion ignores an unsafe env override", async () => {
  await withEnv({ GITHUB_COPILOT_CLI_VERSION: "not a version" }, () => {
    assert.equal(copilot.getGitHubCopilotCliVersion(), copilot.GITHUB_COPILOT_CLI_VERSION);
  });
});

test("#12417 getClaudeCliHeaders reads the env at call time", async () => {
  await withEnv({ CLAUDE_CODE_CLIENT_VERSION: "2.1.259" }, () => {
    assert.equal(
      getClaudeCliHeaders()["User-Agent"],
      "claude-cli/2.1.259 (external, cli)"
    );
  });
});

test("#12417 Claude billing pin stays captured while getter follows env", async () => {
  await withEnv({ CLAUDE_CODE_CLIENT_VERSION: "2.1.259" }, () => {
    assert.equal(hdr.CLAUDE_CLI_BILLING_VERSION, canonical.CLAUDE_CODE_CLIENT_BILLING_VERSION);
    assert.equal(
      hdr.getClaudeCliBillingVersion(),
      `2.1.259.${CLAUDE_CODE_CLIENT_BUILD_REVISION}`
    );
  });
});
