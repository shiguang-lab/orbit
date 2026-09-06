/**
 * Control-owned Chaos Mode configuration.
 *
 * Chaos Mode configuration — persisted per-instance settings for:
 * - Which providers/models participate
 * - Default mode (parallel vs collaborative)
 * - System prompt overrides
 * - Max timeout per model call
 */

import { z } from "zod";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/db/settings";

// ── Schema ───────────────────────────────────────────────────────────────────

export const chaosConfigSchema = z.object({
  enabled: z.boolean().default(false),
  defaultMode: z.enum(["parallel", "collaborative"]).default("parallel"),
  providerOverrides: z
    .array(
      z.object({
        providerId: z.string().min(1),
        modelId: z.string().optional(),
        enabled: z.boolean().default(true),
      })
    )
    .max(200)
    .default([]),
  systemPrompt: z.string().max(10_000).optional(),
  timeoutMs: z.number().int().min(5_000).max(600_000).default(120_000),
  maxTokens: z.number().int().min(256).max(128_000).default(4096),
});

export type ChaosConfig = z.infer<typeof chaosConfigSchema>;

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  enabled: false,
  defaultMode: "parallel",
  providerOverrides: [],
  timeoutMs: 120_000,
  maxTokens: 4096,
};

// ── Persistence ──────────────────────────────────────────────────────────────
//
// Persisted via the shared settings contract (`key_value`, namespace `settings`).

const CONFIG_KEY = "chaosModeConfig";

/**
 * Get the current Chaos Mode configuration.
 */
export async function getChaosConfig(): Promise<ChaosConfig> {
  try {
    const settings = await getSettings();
    const raw = settings[CONFIG_KEY];

    if (raw === undefined || raw === null) {
      return DEFAULT_CHAOS_CONFIG;
    }

    const result = chaosConfigSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }

    // Fall back to default if stored config is invalid
    return DEFAULT_CHAOS_CONFIG;
  } catch {
    return DEFAULT_CHAOS_CONFIG;
  }
}

/**
 * Update the Chaos Mode configuration.
 */
export async function setChaosConfig(config: ChaosConfig): Promise<ChaosConfig> {
  const validated = chaosConfigSchema.parse(config);

  await updateSettings({ [CONFIG_KEY]: validated }, { applyRuntime: false });

  return validated;
}

/**
 * Reset chaos config to defaults.
 */
export async function resetChaosConfig(): Promise<ChaosConfig> {
  await updateSettings({ [CONFIG_KEY]: null }, { applyRuntime: false });
  return DEFAULT_CHAOS_CONFIG;
}
