export type ModelCapabilityInput =
  | string
  | { provider?: string | null; model?: string | null };

export interface ModelCapabilityResolutionSnapshot {
  readonly synced: ReadonlyMap<string, unknown>;
  readonly maxTokenOverrides: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly maxInputTokenOverrides: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly reasoningEffortsOverrides: ReadonlyMap<string, ReadonlyMap<string, readonly unknown[]>>;
  readonly contextOverrides: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly customVisionOverrides: ReadonlyMap<string, unknown>;
}

export interface ResolvedModelCapabilities {
  provider: string | null;
  model: string | null;
  rawModel: string | null;
  toolCalling: boolean;
  reasoning: boolean;
  supportsThinking: boolean | null;
  supportedThinkingEfforts: readonly string[] | null;
  reasoningEffortsOverride: boolean;
  supportsTools: boolean | null;
  supportsVision: boolean | null;
  supportsAudio: boolean | null;
  supportsVideo: boolean | null;
  supportsMaxTokens: boolean;
  attachment: boolean | null;
  structuredOutput: boolean | null;
  temperature: boolean | null;
  contextWindow: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  defaultThinkingBudget: number;
  thinkingBudgetCap: number | null;
  thinkingOverhead: number | null;
  adaptiveMaxTokens: number | null;
  family: string | null;
  status: string | null;
  openWeights: boolean | null;
  knowledgeCutoff: string | null;
  releaseDate: string | null;
  lastUpdated: string | null;
  modalitiesInput: string[];
  modalitiesOutput: string[];
  interleavedField: string | null;
}

export function createModelCapabilityResolutionSnapshot(): ModelCapabilityResolutionSnapshot;
export function getResolvedModelCapabilities(
  input: ModelCapabilityInput,
  options?: { persistedOverrides?: boolean },
  snapshot?: ModelCapabilityResolutionSnapshot | null,
): ResolvedModelCapabilities;
export function getResolvedModelContextOverride(
  input: ModelCapabilityInput,
  snapshot?: ModelCapabilityResolutionSnapshot | null,
): number | null;
export function getExplicitModelOutputCap(
  input: ModelCapabilityInput,
  snapshot?: ModelCapabilityResolutionSnapshot | null,
): number | null;
export function resolveInputTokenCapForGate(
  input: ModelCapabilityInput,
  options?: { isCombo?: boolean },
): number | null;
export function supportsToolCalling(input: ModelCapabilityInput): boolean;
export function supportsReasoning(input: ModelCapabilityInput): boolean;
export function supportsMaxTokens(input: ModelCapabilityInput): boolean;
export function capMaxOutputTokens(input: ModelCapabilityInput, requested?: number): number | null;
export function getDefaultThinkingBudget(input: ModelCapabilityInput): number;
export function capThinkingBudget(input: ModelCapabilityInput, budget: number): number;
export function getModelContextLimit(
  providerOrInput: ModelCapabilityInput,
  modelId?: string,
  snapshot?: ModelCapabilityResolutionSnapshot | null,
): number | null;
