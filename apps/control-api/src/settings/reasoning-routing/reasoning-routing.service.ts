import { Injectable } from "@nestjs/common";
import {
  createReasoningRoutingRule,
  deleteReasoningRoutingRule,
  getReasoningRoutingRuleById,
  getReasoningRoutingRules,
  reasoningRuleDataToInput,
  resolveCodexWsModelInfo,
  resolveReasoningRoutingRule,
  resolveReasoningSourceModels,
  updateReasoningRoutingRule,
  validateCodexWsDecision,
  type ReasoningRoutingRule,
  type ReasoningRoutingRuleInput,
  type ReasoningRoutingSimulationInput,
} from "@orbit/core/control/reasoning-routing";
import {
  getComboForModel,
  getModelInfo,
} from "@orbit/inference/services/runtimeModel";
import { getApiKeyById } from "@orbit/core/db/api-keys";
import {
  validateApiKeyRoutingTarget,
  type ApiKeyMetadata,
} from "@orbit/core/runtime/api-key-policy";

function permissionMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "The API key cannot access the target";
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "The API key cannot access the target";
}

function readPermissionError(targetRejection: Response | null): Promise<string | null> {
  if (!targetRejection) return Promise.resolve(null);
  return targetRejection
    .json()
    .then(permissionMessage)
    .catch(() => "The API key cannot access the target");
}

function simulationErrors(
  decision: Awaited<ReturnType<typeof resolveReasoningRoutingRule>>,
  transportError: string | null,
  permissionError: string | null,
) {
  return [
    ...(decision?.capability === "unsupported"
      ? ["The configured effort is not supported by the target model"]
      : []),
    ...(transportError ? [transportError] : []),
    ...(permissionError ? [permissionError] : []),
  ];
}

/** Use cases for persisted reasoning policies and policy simulation. */
@Injectable()
export class ReasoningRoutingService {
  list(): Promise<ReasoningRoutingRule[]> {
    return getReasoningRoutingRules();
  }

  create(data: ReasoningRoutingRuleInput): Promise<ReasoningRoutingRule> {
    return createReasoningRoutingRule(reasoningRuleDataToInput(data));
  }

  get(id: string): Promise<ReasoningRoutingRule | null> {
    return getReasoningRoutingRuleById(id);
  }

  update(id: string, data: ReasoningRoutingRuleInput): Promise<ReasoningRoutingRule | null> {
    return updateReasoningRoutingRule(id, reasoningRuleDataToInput(data));
  }

  remove(id: string): Promise<boolean> {
    return deleteReasoningRoutingRule(id);
  }

  async simulate(
    request: Request,
    data: ReasoningRoutingSimulationInput,
  ) {
    const apiKey = (data.apiKeyId ? await getApiKeyById(data.apiKeyId) : null) as
      | (ApiKeyMetadata & { key?: string | null })
      | null;
    if (data.apiKeyId && !apiKey) return { notFound: true as const };

    const combo = await getComboForModel(data.model);
    const sourceModels = combo
      ? { normalized: data.model, aliases: [] as string[] }
      : await resolveReasoningSourceModels(data.model, (value) =>
          data.transport === "codex-ws"
            ? resolveCodexWsModelInfo(value, getModelInfo)
            : getModelInfo(value),
        );
    const decision = await resolveReasoningRoutingRule({
      sourceModel: sourceModels.normalized,
      sourceModelAliases: sourceModels.aliases,
      sourceEffort: data.effort === "any" ? "missing" : data.effort,
      hasReasoningSignal:
        (data.effort !== "missing" && data.effort !== "any") ||
        typeof data.thinkingBudgetTokens === "number",
      hasThinkingBudget: typeof data.thinkingBudgetTokens === "number",
      apiKeyId: apiKey?.id ?? null,
      comboId: typeof combo?.id === "string" ? combo.id : null,
      requestTags: data.requestTags,
    });
    const transportError =
      decision && data.transport === "codex-ws" ? validateCodexWsDecision(decision) : null;
    const targetRejection = decision
      ? await validateApiKeyRoutingTarget(
          request,
          typeof apiKey?.key === "string" ? apiKey.key : null,
          apiKey,
          decision.targetModel,
        )
      : null;
    const permissionError = await readPermissionError(targetRejection);
    return {
      matched: !!decision,
      decision,
      errors: simulationErrors(decision, transportError, permissionError),
    };
  }
}
