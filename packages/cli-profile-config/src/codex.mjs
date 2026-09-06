import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { categoriseModel, fallbackCodexProfile } from "./model-profile.mjs";

export function buildProfileToml(modelId, config) {
  const lines = [
    `# codex --profile ${config.name}`,
    `# ${modelId}`,
    `model                          = "${modelId}"`,
    `model_provider                 = "shiguangGateway"`,
  ];
  if (config.effort) lines.push(`model_reasoning_effort         = "${config.effort}"`);
  if (config.summary) lines.push(`model_reasoning_summary        = "detailed"`);
  lines.push(
    `model_context_window           = ${config.ctx}`,
    `model_auto_compact_token_limit = ${config.compact}`,
    `tool_output_token_limit        = ${config.toolLimit}`,
  );
  return `${lines.join("\n")}\n`;
}

export async function syncCodexProfilesFromModels(models, options = {}) {
  const codexHome = options.codexHome || join(os.homedir(), ".codex");
  const dryRun = Boolean(options.dryRun);
  const onlyFilter = options.only ? options.only.split(",").map((value) => value.trim()) : null;
  if (!dryRun && !existsSync(codexHome)) mkdirSync(codexHome, { recursive: true });
  let written = 0;
  let skipped = 0;
  const profiles = [];
  for (const model of models) {
    const id = typeof model === "string" ? model : (model.id ?? "");
    if (!id || (onlyFilter && !onlyFilter.some((filter) => id.includes(filter)))) {
      skipped += 1;
      continue;
    }
    const config = categoriseModel(id) ?? fallbackCodexProfile(id, model);
    if (!config) {
      skipped += 1;
      continue;
    }
    const filePath = join(codexHome, `${config.name}.config.toml`);
    const content = buildProfileToml(id, config);
    if (dryRun) {
      console.log(`\n── [dry-run] ${filePath} ──`);
      console.log(content);
    } else writeFileSync(filePath, content, "utf8");
    profiles.push({ name: config.name, model: id, filePath });
    written += 1;
  }
  return { written, skipped, profiles };
}
