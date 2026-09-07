import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { resolveProviderAlias } from "@orbit/inference/services/model";
import { parseReasoningEffortsOverride } from "@orbit/core/shared/reasoning-efforts-override";
import {
  listModelCapabilityOverrides,
  removeModelCapabilityOverride,
  setModelCapabilityOverride,
  type ModelCapabilityOverrideKey,
} from "@orbit/core/control/model-capability-overrides";
import {
  listModelContextOverrides,
  removeModelContextOverride,
  setModelContextOverride,
} from "@orbit/core/control/model-context-overrides";
import {
  getProviderPrefixIndex,
  type ProviderPrefixEntry,
} from "@orbit/core/pricing/provider-prefixes";

const overrideKeySchema = z.enum([
  "context_length",
  "max_input_tokens",
  "max_output_tokens",
  "reasoning_efforts",
]);
type PublicOverrideKey = z.infer<typeof overrideKeySchema>;
type PublicOverride = {
  provider: string;
  modelId: string;
  target: string;
  key: PublicOverrideKey;
  value: number | string[];
  refreshedAt: string;
};

const reasoningEffortsValueSchema = z.string().transform((value, context) => {
  const parsed = parseReasoningEffortsOverride(value);
  if (!parsed.ok) {
    context.addIssue({ code: "custom", message: parsed.error });
    return z.NEVER;
  }
  return parsed.efforts;
});

const upsertOverrideSchema = z.discriminatedUnion("key", [
  z.object({
    target: z.string().min(3),
    key: z.enum(["context_length", "max_input_tokens", "max_output_tokens"]),
    value: z.coerce.number().int().positive(),
  }),
  z.object({
    target: z.string().min(3),
    key: z.literal("reasoning_efforts"),
    value: reasoningEffortsValueSchema,
  }),
]);

type PrefixMaps = {
  entries: Map<string, ProviderPrefixEntry>;
  nodeToPrefix: Map<string, string>;
  prefixToNode: Map<string, string>;
  eligibleNodeIds: Set<string>;
  compatibleNodeIds: Set<string>;
};

@Injectable()
export class ModelCapabilityOverridesService {
  private async loadPrefixMaps(): Promise<PrefixMaps> {
    const index = await getProviderPrefixIndex();
    return {
      entries: index.entries,
      nodeToPrefix: index.nodeToPrefix,
      prefixToNode: index.prefixToNode,
      eligibleNodeIds: index.eligibleNodeIds,
      compatibleNodeIds: index.compatibleNodeIds,
    };
  }

  private async listPublicOverrides(
    nodeToPrefix: Map<string, string>,
    eligibleNodeIds: Set<string>,
    compatibleNodeIds: Set<string>,
  ): Promise<PublicOverride[]> {
    const capabilityOverrides = listModelCapabilityOverrides() as PublicOverride[];
    const contextOverrides = listModelContextOverrides().map((override): PublicOverride => ({
      provider: override.provider,
      modelId: override.modelId,
      target: `${override.provider}/${override.modelId}`,
      key: "context_length",
      value: override.realContext,
      refreshedAt: override.refreshedAt,
    }));
    return [...capabilityOverrides, ...contextOverrides]
      .filter((override) => !compatibleNodeIds.has(override.provider) || eligibleNodeIds.has(override.provider))
      .map((override) => {
        const displayProvider = nodeToPrefix.get(override.provider) || override.provider;
        return {
          ...override,
          provider: displayProvider,
          target: `${displayProvider}/${override.modelId}`,
        };
      })
      .sort((left, right) => right.refreshedAt.localeCompare(left.refreshedAt));
  }

  private canonicalizeTarget(
    target: string,
    entries: Map<string, ProviderPrefixEntry>,
    prefixToNode: Map<string, string>,
    compatibleNodeIds: Set<string>,
    eligibleNodeIds: Set<string>,
  ): { ok: true; target: string } | { ok: false } {
    const raw = target.trim();
    const slashIndex = raw.indexOf("/");
    if (slashIndex <= 0 || slashIndex === raw.length - 1) return { ok: false };
    const provider = raw.slice(0, slashIndex).trim();
    const modelId = raw.slice(slashIndex + 1).trim();
    if (!provider || !modelId || compatibleNodeIds.has(provider)) return { ok: false };
    const configured = entries.get(provider);
    if (configured?.status === "ambiguous") return { ok: false };
    const resolvedNodeId = prefixToNode.get(provider);
    if (resolvedNodeId && !eligibleNodeIds.has(resolvedNodeId)) return { ok: false };
    const canonicalProvider = resolvedNodeId || resolveProviderAlias(provider) || provider;
    return { ok: true, target: `${canonicalProvider}/${modelId}` };
  }

  async list(): Promise<{ overrides: PublicOverride[] }> {
    const { nodeToPrefix, eligibleNodeIds, compatibleNodeIds } = await this.loadPrefixMaps();
    return { overrides: await this.listPublicOverrides(nodeToPrefix, eligibleNodeIds, compatibleNodeIds) };
  }

  async upsert(rawBody: unknown): Promise<
    | { ok: true; result: { overrides: PublicOverride[] } }
    | { ok: false; status: 400; error: unknown }
  > {
    const parsed = upsertOverrideSchema.safeParse(rawBody);
    if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues };
    const maps = await this.loadPrefixMaps();
    const canonical = this.canonicalizeTarget(
      parsed.data.target,
      maps.entries,
      maps.prefixToNode,
      maps.compatibleNodeIds,
      maps.eligibleNodeIds,
    );
    if (!canonical.ok) {
      return { ok: false, status: 400, error: "Invalid or ambiguous model capability override target" };
    }
    const targetParts = canonical.target.split(/\/(.*)/s);
    const written = parsed.data.key === "context_length"
      ? setModelContextOverride(targetParts[0], targetParts[1], parsed.data.value, "manual")
      : setModelCapabilityOverride(canonical.target, parsed.data.key as ModelCapabilityOverrideKey, parsed.data.value);
    if (!written) return { ok: false, status: 400, error: "Invalid model capability override" };
    return {
      ok: true,
      result: { overrides: await this.listPublicOverrides(maps.nodeToPrefix, maps.eligibleNodeIds, maps.compatibleNodeIds) },
    };
  }

  async remove(target: string, key: string): Promise<
    | { ok: true; result: { overrides: PublicOverride[] } }
    | { ok: false; status: 400; error: string }
  > {
    const parsedKey = overrideKeySchema.safeParse(key);
    const maps = await this.loadPrefixMaps();
    const canonical = this.canonicalizeTarget(target, maps.entries, maps.prefixToNode, maps.compatibleNodeIds, maps.eligibleNodeIds);
    if (!canonical.ok || !parsedKey.success) {
      return { ok: false, status: 400, error: "target and key are required; target must be a valid model override target" };
    }
    if (parsedKey.data === "context_length") {
      const targetParts = canonical.target.split(/\/(.*)/s);
      removeModelContextOverride(targetParts[0], targetParts[1]);
    } else {
      removeModelCapabilityOverride(canonical.target, parsedKey.data as ModelCapabilityOverrideKey);
    }
    return {
      ok: true,
      result: { overrides: await this.listPublicOverrides(maps.nodeToPrefix, maps.eligibleNodeIds, maps.compatibleNodeIds) },
    };
  }
}
