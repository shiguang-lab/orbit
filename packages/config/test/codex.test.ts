import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { syncCodexProfilesFromModels } from "@orbit/config/cli/codex";

test("writes the established Codex TOML payload and skips non-text models", async () => {
  const codexHome = mkdtempSync(join(os.tmpdir(), "cli-profile-codex-"));
  try {
    const result = await syncCodexProfilesFromModels(
      ["glm/glm-5.2", { id: "vendor/speech", type: "audio" }],
      { codexHome },
    );
    assert.equal(result.written, 1);
    assert.equal(result.skipped, 1);
    assert.equal(
      readFileSync(join(codexHome, "glm52.config.toml"), "utf8"),
      '# codex --profile glm52\n# glm/glm-5.2\nmodel                          = "glm/glm-5.2"\nmodel_provider                 = "shiguangGateway"\nmodel_reasoning_effort         = "xhigh"\nmodel_reasoning_summary        = "detailed"\nmodel_context_window           = 131072\nmodel_auto_compact_token_limit = 112000\ntool_output_token_limit        = 32768\n',
    );
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test("only filtering and dry-run preserve filesystem behavior", async () => {
  const codexHome = join(os.tmpdir(), `cli-profile-codex-dry-${process.pid}-${Date.now()}`);
  const lines: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => { lines.push(args); };
  try {
    const result = await syncCodexProfilesFromModels(["glm/glm-5.2", "kmc/kimi-k2.7"], {
      codexHome,
      dryRun: true,
      only: "kimi",
    });
    assert.deepEqual({ written: result.written, skipped: result.skipped }, { written: 1, skipped: 1 });
    assert.equal(lines.length, 2);
    assert.equal(existsSync(codexHome), false);
  } finally {
    console.log = originalLog;
    rmSync(codexHome, { recursive: true, force: true });
  }
});
