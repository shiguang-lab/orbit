/**
 * shiguangGateway setup-opencode — Remote-aware OpenCode provider generator
 * (openai-compatible). This writes the `shiguangGateway` provider into
 * the active OpenCode JSON/JSONC config with every catalog model, so you can run
 * `opencode -m shiguangGateway/<model>`.
 *
 * Reuses the proven server-side generator (config-generator/opencode.ts) for the
 * catalog fetch + merge, then references the API key by env var (never on disk).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { applyEdits, modify, parse, printParseErrorCode } from "jsonc-parser";
import { printHeading, printInfo, printSuccess, printError } from "../io.mjs";
import { resolveActiveContext } from "../contexts.mjs";
import { guardHostConfigTarget } from "../utils/config-home-guard.mjs";

const ENV_KEY_REF = "{env:SHIGUANG_GATEWAY_API_KEY}";
const JSON_FORMATTING_OPTIONS = { insertSpaces: true, tabSize: 2 };

/** Resolve baseUrl + (literal) apiKey from flags → active context → localhost. */
export function resolveOpencodeTarget(opts = {}) {
  let baseUrl;
  if (opts.remote) {
    baseUrl = String(opts.remote).replace(/\/+$/, "");
  } else {
    try {
      const c = resolveActiveContext(opts.context ?? process.env.SHIGUANG_GATEWAY_CONTEXT);
      baseUrl = c?.baseUrl;
    } catch {
      /* no context */
    }
    if (!baseUrl)
      baseUrl = `http://localhost:${Number(opts.port ?? process.env.PORT ?? 8787) || 8787}`;
  }

  let apiKey = opts.apiKey ?? opts["api-key"];
  if (!apiKey) {
    try {
      const c = resolveActiveContext(opts.context ?? process.env.SHIGUANG_GATEWAY_CONTEXT);
      apiKey = c?.accessToken || c?.apiKey;
    } catch {
      /* no context auth */
    }
  }
  if (!apiKey) apiKey = process.env.SHIGUANG_GATEWAY_API_KEY || "";
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

/**
 * Post-process the generator output: reference the API key by env var (keep the
 * secret off disk) and optionally keep only models whose id matches `only`.
 * Pure + testable. Returns the final JSONC string while preserving comments
 * outside the ShiguangGateway-managed fields.
 *
 * @param {string} rawJson  output of generateOpencodeConfig
 * @param {{ only?: string[] }} [opts]
 * @returns {{ json: string, modelCount: number }}
 */
export function postProcessOpencodeConfig(rawJson, opts = {}) {
  const errors = [];
  const config = parse(rawJson, errors, { allowTrailingComma: true, disallowComments: false });
  if (errors.length > 0 || !config || typeof config !== "object" || Array.isArray(config)) {
    const details = errors
      .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
      .join(", ");
    throw new Error(`Failed to parse generated OpenCode config${details ? `: ${details}` : ""}`);
  }

  const prov = config.provider?.shiguangGateway;
  let json = rawJson;
  if (prov?.options) {
    json = applyEdits(
      json,
      modify(json, ["provider", "shiguangGateway", "options", "apiKey"], ENV_KEY_REF, {
        formattingOptions: JSON_FORMATTING_OPTIONS,
      })
    );
  }

  let models = prov?.models;
  if (opts.only && opts.only.length && prov?.models) {
    const kept = {};
    for (const [id, entry] of Object.entries(prov.models)) {
      if (opts.only.some((f) => id.includes(f))) kept[id] = entry;
    }
    models = kept;
    json = applyEdits(
      json,
      modify(json, ["provider", "shiguangGateway", "models"], kept, {
        formattingOptions: JSON_FORMATTING_OPTIONS,
      })
    );
  }
  const modelCount = models ? Object.keys(models).length : 0;
  return { json: json.endsWith("\n") ? json : `${json}\n`, modelCount };
}

export async function runSetupOpencodeCommand(opts = {}) {
  const { baseUrl, apiKey } = resolveOpencodeTarget(opts);
  const dryRun = Boolean(opts.dryRun ?? opts["dry-run"]);
  const only = opts.only
    ? opts.only
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  printHeading("ShiguangGateway → OpenCode provider (openai-compatible)");
  printInfo(`Connecting to ${baseUrl} …`);

  // Deferred import: opencode.ts is TypeScript; tsx is registered by
  // The app entry registers tsx before any command runs, so importing here is safe.
  let raw;
  let configPath;
  try {
    const { generateOpencodeConfig, resolveOpencodeConfigPath } = await import(
      "@shiguang-gateway/core-domain/cli/opencode-config"
    );
    configPath = resolveOpencodeConfigPath();

    const guard = await guardHostConfigTarget(configPath, {
      toolLabel: "OpenCode",
      hostCommand: "shiguangGateway setup-opencode",
      allowContainerWrite: Boolean(opts.allowContainerWrite ?? opts["allow-container-write"]),
      dryRun,
    });
    if (guard !== 0) return guard;

    raw = await generateOpencodeConfig({
      baseUrl,
      apiKey,
      model: opts.model,
      providerId: "shiguangGateway",
      configPath,
    });
  } catch (err) {
    printError(`Failed to generate OpenCode config: ${err?.message || err}`);
    printInfo("Make sure ShiguangGateway is running and --remote/--api-key are correct.");
    return 1;
  }

  const { json, modelCount } = postProcessOpencodeConfig(raw, { only });
  const configDir = dirname(configPath);

  if (dryRun) {
    console.log(json.length > 4000 ? json.slice(0, 4000) + "\n… (truncated)" : json);
    printInfo(`[dry-run] ${modelCount} model(s) under provider 'shiguangGateway' → ${configPath}`);
    return 0;
  }

  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, json, "utf8");
  printSuccess(
    `${basename(configPath)} updated at ${configPath} (${modelCount} models under 'shiguangGateway')`
  );
  printInfo('Use it:  opencode -m shiguangGateway/<model> "..."   (export SHIGUANG_GATEWAY_API_KEY first)');
  return 0;
}

export function registerSetupOpencode(program) {
  program
    .command("setup-opencode")
    .description(
      "Generate the ShiguangGateway openai-compatible provider in the active OpenCode config " +
        "from the live model catalog (local or remote VPS)"
    )
    .option("--port <port>", "Local ShiguangGateway port (ignored when --remote is set)", "8787")
    .option("--remote <url>", "Remote ShiguangGateway URL, e.g. http://192.168.0.15:8787")
    .option("--api-key <key>", "ShiguangGateway API key (defaults to SHIGUANG_GATEWAY_API_KEY env var)")
    .option("--model <id>", "Set the default top-level model (shiguangGateway/<id>)")
    .option("--only <patterns>", "Comma-separated substrings — keep only matching model IDs")
    .option("--dry-run", "Print what would be written without touching the filesystem")
    .option(
      "--allow-container-write",
      "Write even when the target is inside a container and not mounted from the host"
    )
    .action(async (opts) => {
      const code = await runSetupOpencodeCommand(opts);
      if (code !== 0) process.exit(code);
    });
}
