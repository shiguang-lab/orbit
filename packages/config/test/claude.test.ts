import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { syncClaudeProfilesFromModels } from "@orbit/config/cli/claude";

test("writes the established Claude settings payload without credentials", async () => {
  const claudeHome = mkdtempSync(join(os.tmpdir(), "cli-profile-claude-"));
  try {
    const result = await syncClaudeProfilesFromModels(["glm/glm-5.2"], {
      claudeHome,
      baseUrl: "http://127.0.0.1:8787",
    });
    assert.equal(result.written, 1);
    const settings = JSON.parse(readFileSync(join(claudeHome, "profiles/glm52/settings.json"), "utf8"));
    assert.deepEqual(settings, {
      $schema: "https://json.schemastore.org/claude-code-settings.json",
      model: "glm/glm-5.2",
      env: {
        ANTHROPIC_BASE_URL: "http://127.0.0.1:8787",
        ANTHROPIC_MODEL: "glm/glm-5.2",
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1",
        CLAUDE_CODE_AUTO_COMPACT_WINDOW: "190000",
      },
      effortLevel: "xhigh",
    });
    assert.equal("ANTHROPIC_AUTH_TOKEN" in settings.env, false);
  } finally {
    rmSync(claudeHome, { recursive: true, force: true });
  }
});

test("dry-run uses the injected logger and creates no profile tree", async () => {
  const claudeHome = join(os.tmpdir(), `cli-profile-claude-dry-${process.pid}-${Date.now()}`);
  const lines: string[] = [];
  try {
    const result = await syncClaudeProfilesFromModels(["vendor/new-chat"], {
      claudeHome,
      baseUrl: "https://gateway.example",
      dryRun: true,
      log: (line) => lines.push(line),
    });
    assert.equal(result.written, 1);
    assert.equal(lines.length, 2);
    assert.equal(existsSync(join(claudeHome, "profiles")), false);
  } finally {
    rmSync(claudeHome, { recursive: true, force: true });
  }
});
