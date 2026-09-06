/**
 * shiguangGateway setup-codex — Remote-aware Codex CLI profile generator.
 *
 * Connects to a running ShiguangGateway instance (local or remote VPS), fetches the
 * live model catalog via GET /v1/models, then generates ~/.codex/<name>.config.toml
 * profile files for each model — so you can switch providers with a single flag
 * (`codex --profile glm52`) without editing config files by hand.
 *
 * Primary use-case: configure a local Codex CLI to use models from a VPS.
 *   shiguangGateway setup-codex --remote http://100.67.86.91:8787 --api-key sk-xxx
 *
 * The command is idempotent: re-running updates existing profile files in place.
 */

import { join } from "node:path";
import os from "node:os";
import { syncCodexProfilesFromModels } from "@shiguang-gateway/cli-profile-config/codex";
import { printHeading, printInfo, printSuccess, printError } from "../io.mjs";
import { guardHostConfigTarget } from "../utils/config-home-guard.mjs";
import { t } from "../i18n.mjs";

// ── Command ───────────────────────────────────────────────────────────────────

/**
 * @param {{remote?:string, port?:string, apiKey?:string, codexHome?:string, dryRun?:boolean, only?:string}} opts
 * @returns {Promise<number>}
 */
export async function runSetupCodexCommand(opts = {}) {
  const port = Number(opts.port ?? process.env.PORT ?? 8787) || 8787;
  const baseUrl = (opts.remote ?? `http://localhost:${port}`).replace(/\/v1$/, "");
  const apiKey = opts.apiKey ?? opts["api-key"] ?? process.env.SHIGUANG_GATEWAY_API_KEY ?? "";
  const codexHome = opts.codexHome ?? opts["codex-home"] ?? join(os.homedir(), ".codex");
  const dryRun = Boolean(opts.dryRun ?? opts["dry-run"]);
  const onlyFilter = opts.only ? opts.only.split(",").map((s) => s.trim()) : null;

  printHeading(`ShiguangGateway → Codex CLI profile generator`);

  const guard = await guardHostConfigTarget(codexHome, {
    toolLabel: "Codex",
    hostCommand: "shiguangGateway setup-codex",
    allowContainerWrite: Boolean(opts.allowContainerWrite ?? opts["allow-container-write"]),
    dryRun,
  });
  if (guard !== 0) return guard;
  printInfo(`Connecting to ${baseUrl} …`);

  // ── Fetch model catalog ───────────────────────────────────────────────────
  let models;
  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
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

  // ── Generate profiles ─────────────────────────────────────────────────────
  const { written, skipped, profiles } = await syncCodexProfilesFromModels(models, {
    codexHome,
    dryRun,
    only: opts.only,
  });

  if (!dryRun) {
    for (const profile of profiles) {
      printSuccess(`  ✓ ${profile.name}.config.toml  (${profile.model})`);
    }
    console.log("");
    printSuccess(`${written} profiles written to ${codexHome}`);
    if (skipped > 0) {
      printInfo(`${skipped} models skipped (no matching profile pattern)`);
    }
    console.log("\nTo use a profile:");
    console.log("  codex --profile <name>    # e.g. codex --profile glm52");
    console.log("  codex -p <name>           # short form");
  } else {
    console.log(`\n[dry-run] ${written} profiles would be written (${skipped} skipped)`);
  }

  return 0;
}

export function registerSetupCodex(program) {
  program
    .command("setup-codex")
    .description(
      "Fetch the live model catalog from ShiguangGateway (local or remote VPS) and generate " +
        "~/.codex/<name>.config.toml profiles for each supported model"
    )
    .option("--port <port>", "Local ShiguangGateway port (ignored when --remote is set)", "8787")
    .option(
      "--remote <url>",
      "Remote ShiguangGateway URL, e.g. http://100.67.86.91:8787 — fetches models from there"
    )
    .option(
      "--api-key <key>",
      "ShiguangGateway API key for the remote instance (defaults to SHIGUANG_GATEWAY_API_KEY env var)"
    )
    .option("--codex-home <dir>", "Directory where profile files are written (default: ~/.codex)")
    .option(
      "--only <patterns>",
      "Comma-separated substrings — only generate profiles for matching model IDs (e.g. glm,kimi)"
    )
    .option("--dry-run", "Print what would be written without touching the filesystem")
    .option(
      "--allow-container-write",
      "Write even when the target is inside a container and not mounted from the host"
    )
    .action(async (opts) => {
      const exitCode = await runSetupCodexCommand(opts);
      if (exitCode !== 0) process.exit(exitCode);
    });
}
