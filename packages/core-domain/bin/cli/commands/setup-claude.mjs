/**
 * shiguangGateway setup-claude — Remote-aware Claude Code profile generator.
 *
 * Claude Code has no native profile files (unlike Codex). The idiomatic way to
 * keep multiple named configs is `CLAUDE_CONFIG_DIR` — a separate config dir per
 * profile (its own settings.json, credentials, history, cache). This command
 * fetches the live /v1/models catalog from a (possibly remote) ShiguangGateway and
 * writes `~/.claude/profiles/<name>/settings.json` for each supported model,
 * reusing the SAME profile names as `setup-codex` (glm52, kimi-k27, …).
 *
 * Launch a profile with:  shiguangGateway launch --profile <name>
 * (which injects ANTHROPIC_AUTH_TOKEN from the active context — the token is
 * never written to disk). Or export ANTHROPIC_AUTH_TOKEN and run:
 *   CLAUDE_CONFIG_DIR=~/.claude/profiles/<name> claude
 *
 * Idempotent: re-running overwrites each profile's settings.json in place.
 */

import { join } from "node:path";
import os from "node:os";
import { syncClaudeProfilesFromModels } from "@shiguang-gateway/cli-profile-config/claude";
import { printHeading, printInfo, printSuccess, printError } from "../io.mjs";
import { guardHostConfigTarget } from "../utils/config-home-guard.mjs";
/**
 * @param {{remote?:string, port?:string, apiKey?:string, claudeHome?:string, dryRun?:boolean, only?:string}} opts
 * @returns {Promise<number>}
 */
export async function runSetupClaudeCommand(opts = {}) {
  const port = Number(opts.port ?? process.env.PORT ?? 8787) || 8787;
  const baseUrl = (opts.remote ?? `http://localhost:${port}`)
    .replace(/\/+$/, "")
    .replace(/\/v1$/, "");
  const apiKey = opts.apiKey ?? opts["api-key"] ?? process.env.SHIGUANG_GATEWAY_API_KEY ?? "";
  const claudeHome = opts.claudeHome ?? opts["claude-home"] ?? join(os.homedir(), ".claude");
  const profilesRoot = join(claudeHome, "profiles");
  const dryRun = Boolean(opts.dryRun ?? opts["dry-run"]);

  printHeading("ShiguangGateway → Claude Code profile generator");
  printInfo(`Connecting to ${baseUrl} …`);

  const guard = await guardHostConfigTarget(profilesRoot, {
    toolLabel: "Claude Code",
    hostCommand: "shiguangGateway setup-claude",
    allowContainerWrite: Boolean(opts.allowContainerWrite ?? opts["allow-container-write"]),
    dryRun,
  });
  if (guard !== 0) return guard;

  // ── Fetch model catalog ───────────────────────────────────────────────────
  let models;
  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errorBody = await res.json();
        const serverMsg =
          errorBody?.error?.message || errorBody?.error || errorBody?.message || "";
        if (serverMsg) detail += ` — ${serverMsg}`;
      } catch {}
      throw new Error(detail);
    }
    const body = await res.json();
    models = body.data ?? body.models ?? [];
  } catch (err) {
    printError(`Failed to fetch models: ${err.message}`);
    printInfo(
      "Make sure ShiguangGateway is running and the --remote URL is correct.\n" +
        "You may also need --api-key if ShiguangGateway requires authentication."
    );
    return 1;
  }

  printInfo(`Received ${models.length} models from ${baseUrl}`);

  const { written, skipped, profiles } = await syncClaudeProfilesFromModels(models, {
    claudeHome,
    baseUrl,
    dryRun,
    only: opts.only,
  });

  if (!dryRun) {
    for (const profile of profiles) {
      printSuccess(`  ✓ profiles/${profile.name}/settings.json  (${profile.model})`);
    }
    console.log("");
    printSuccess(`${written} Claude Code profiles written to ${profilesRoot}`);
    if (skipped > 0) printInfo(`${skipped} models skipped (no matching profile pattern)`);
    console.log("\nTo use a profile:");
    console.log("  shiguangGateway launch --profile <name>     # e.g. shiguangGateway launch --profile glm52");
    console.log(
      "  # or: CLAUDE_CONFIG_DIR=~/.claude/profiles/<name> claude  (export ANTHROPIC_AUTH_TOKEN first)"
    );
  } else {
    console.log(`\n[dry-run] ${written} profiles would be written (${skipped} skipped)`);
  }

  return 0;
}

export function registerSetupClaude(program) {
  program
    .command("setup-claude")
    .description(
      "Fetch the live model catalog from ShiguangGateway (local or remote VPS) and generate " +
        "~/.claude/profiles/<name>/ Claude Code profiles (CLAUDE_CONFIG_DIR) for each model"
    )
    .option("--port <port>", "Local ShiguangGateway port (ignored when --remote is set)", "8787")
    .option("--remote <url>", "Remote ShiguangGateway URL, e.g. http://192.168.0.15:8787")
    .option("--api-key <key>", "ShiguangGateway API key (defaults to SHIGUANG_GATEWAY_API_KEY env var)")
    .option("--claude-home <dir>", "Claude home dir (default: ~/.claude)")
    .option(
      "--only <patterns>",
      "Comma-separated substrings — only matching model IDs (e.g. glm,kimi)"
    )
    .option("--dry-run", "Print what would be written without touching the filesystem")
    .option(
      "--allow-container-write",
      "Write even when the target is inside a container and not mounted from the host"
    )
    .action(async (opts) => {
      const exitCode = await runSetupClaudeCommand(opts);
      if (exitCode !== 0) process.exit(exitCode);
    });
}
