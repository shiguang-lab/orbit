/**
 * #12407/#12432: `orbit config set claude` must preserve existing Claude
 * settings (hooks, statusLine, effortLevel, custom env keys) and write the
 * Claude Code env-style keys, not the legacy baseUrl/authToken shape.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "..");
const cliPath = path.join(repoRoot, "src", "orbit.mjs");

test("#12407: config set claude preserves existing settings and writes Claude Code env keys", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "orbit-claude-config-"));
  try {
    const settingsPath = path.join(home, ".claude", "settings.json");
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(
      settingsPath,
      JSON.stringify(
        {
          model: "existing-model",
          effortLevel: "high",
          hooks: { PreToolUse: [{ command: "echo keep" }] },
          statusLine: { type: "command", command: "orbit status" },
          env: { KEEP_ME: "1", ANTHROPIC_BASE_URL: "http://old" },
        },
        null,
        2
      )
    );

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        cliPath,
        "config",
        "set",
        "claude",
        "--model",
        "claude-fallback",
        "--api-key",
        "sk_test_12407",
        "--base-url",
        "http://localhost:8787/v1",
        "--yes",
        "--non-interactive",
        "--allow-container-write",
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          HOME: home,
          USERPROFILE: home,
          ORBIT_API_KEY: "sk_test_12407",
          ORBIT_BASE_URL: "http://localhost:8787/v1",
        },
        timeout: 300_000, // dev-mode CLI cold start (tsx compiling the command registry) takes ~80s
      }
    );

    assert.match(stdout + stderr, /Config written/);
    const written = JSON.parse(await fs.readFile(settingsPath, "utf8"));

    assert.equal(written.model, "claude-fallback");
    assert.equal(written.effortLevel, "high");
    assert.deepEqual(written.hooks, { PreToolUse: [{ command: "echo keep" }] });
    assert.deepEqual(written.statusLine, { type: "command", command: "orbit status" });
    assert.equal(written.env.KEEP_ME, "1");
    assert.equal(written.env.ANTHROPIC_BASE_URL, "http://localhost:8787");
    assert.equal(written.env.ANTHROPIC_AUTH_TOKEN, "sk_test_12407");
    assert.equal(written.env.ANTHROPIC_MODEL, "claude-fallback");
    assert.equal(written.env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY, "1");
    assert.equal("baseUrl" in written, false);
    assert.equal("authToken" in written, false);
    assert.equal("models" in written, false);
  } finally {
    await fs.rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
