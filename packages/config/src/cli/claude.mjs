import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { categoriseModel, isCodexCompatibleTextModel, profileNameFromModelId } from "./model-profile.mjs";

export function fallbackClaudeProfile(modelId, model) {
  if (!isCodexCompatibleTextModel(model)) return null;
  return { name: profileNameFromModelId(modelId) };
}

export function buildProfileSettings(modelId, baseUrl, config) {
  const settings = {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    model: modelId,
    env: {
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_MODEL: modelId,
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1",
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: "190000",
    },
  };
  if (config.effort) settings.effortLevel = config.effort;
  return `${JSON.stringify(settings, null, 2)}\n`;
}

export async function syncClaudeProfilesFromModels(models, options) {
  const claudeHome = options.claudeHome || join(os.homedir(), ".claude");
  const profilesRoot = join(claudeHome, "profiles");
  const dryRun = Boolean(options.dryRun);
  const log = options.log ?? console.log;
  const onlyFilter = options.only ? options.only.split(",").map((value) => value.trim()) : null;
  if (!dryRun && !existsSync(profilesRoot)) mkdirSync(profilesRoot, { recursive: true });
  let written = 0;
  let skipped = 0;
  const profiles = [];
  for (const model of models) {
    const id = typeof model === "string" ? model : (model.id ?? "");
    if (!id || (onlyFilter && !onlyFilter.some((filter) => id.includes(filter)))) {
      skipped += 1;
      continue;
    }
    const config = categoriseModel(id) ?? fallbackClaudeProfile(id, model);
    if (!config) {
      skipped += 1;
      continue;
    }
    const directory = join(profilesRoot, config.name);
    const filePath = join(directory, "settings.json");
    const content = buildProfileSettings(id, options.baseUrl, config);
    if (dryRun) {
      log(`\n── [dry-run] ${filePath} ──`);
      log(content);
    } else {
      mkdirSync(directory, { recursive: true });
      writeFileSync(filePath, content, "utf8");
    }
    profiles.push({ name: config.name, model: id, filePath });
    written += 1;
  }
  return { written, skipped, profiles };
}
