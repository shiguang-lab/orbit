export interface CanonicalModelMetadata {
  provider: string | null;
  providerAlias: string | null;
  providerLabel: string | null;
  model: string;
  qualifiedId: string | null;
  displayName: string;
  aliases: string[];
  capabilities: {
    toolCalling: boolean;
    reasoning: boolean;
    supportsThinking: boolean | null;
    supportedThinkingEfforts: readonly string[] | null;
    supportsTools: boolean | null;
    vision: boolean | null;
    attachment: boolean | null;
    structuredOutput: boolean | null;
    temperature: boolean | null;
  };
  limits: {
    contextWindow: number | null;
    maxInputTokens: number | null;
    maxOutputTokens: number;
    defaultThinkingBudget: number;
    thinkingBudgetCap: number | null;
    thinkingOverhead: number | null;
    adaptiveMaxTokens: number | null;
  };
  metadata: {
    family: string | null;
    status: string | null;
    knowledgeCutoff: string | null;
    releaseDate: string | null;
    lastUpdated: string | null;
    openWeights: boolean | null;
    source: {
      providerRegistry: boolean;
      staticSpec: boolean;
      syncedCapability: boolean;
      reasoningEffortsOverride: boolean;
    };
  };
  modalities: {
    input: string[];
    output: string[];
    interleavedField: string | null;
  };
}
export function getCanonicalModelMetadata(input: {
  provider?: string | null;
  model?: string | null;
}): CanonicalModelMetadata | null;
