import type { ContextBudgetConfig } from "./compression-context-budget.js";
import type { PreserveSystemPromptMode } from "./compression-preserve-system-prompt.js";

export type CompressionMode = "off" | "lite" | "standard" | "aggressive" | "ultra" | "rtk" | "codex-responses" | "omniglyph" | "stacked";
export type CavemanIntensity = "lite" | "full" | "ultra";
export type RtkIntensity = "minimal" | "standard" | "aggressive";
export type CompressionEngineId = "lite" | "caveman" | "aggressive" | "ultra" | "rtk" | "session-dedup" | "headroom" | "ccr" | "llmlingua" | "relevance" | "omniglyph" | "codex-responses";
export interface CompressionPipelineStep { engine: CompressionEngineId; intensity?: string; config?: Record<string, unknown> }
export interface EngineConfigField {
  key: string;
  type: "boolean" | "number" | "string" | "select" | "multiselect";
  label: string;
  i18nKey?: string;
  description?: string;
  defaultValue: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}
export interface EngineToggle { enabled: boolean; level?: string }
export interface OutputStyleSelectionEntry { id: string; level: "lite" | "full" | "ultra" }
export interface CavemanConfig { enabled: boolean; compressRoles: ("user" | "assistant" | "system")[]; skipRules: string[]; minMessageLength: number; preservePatterns: string[]; intensity: CavemanIntensity; language?: string; autoDetectLanguage?: boolean; enabledLanguagePacks?: string[] }
export interface CavemanOutputModeConfig { enabled: boolean; intensity: CavemanIntensity; autoClarity: boolean }
export interface CodexResponsesConfig { enabled: boolean; minBytes: number; maxOutputBytes: number; maxCandidateBytes: number; maxLines: number; minSearchMatches: number; minLogLines: number; preserveToolNames: string[] }
export interface RtkConfig { enabled: boolean; intensity: RtkIntensity; applyToToolResults: boolean; applyToCodeBlocks: boolean; applyToAssistantMessages: boolean; enabledFilters: string[]; disabledFilters: string[]; maxLinesPerResult: number; maxCharsPerResult: number; deduplicateThreshold: number; customFiltersEnabled: boolean; trustProjectFilters: boolean; rawOutputRetention: "never" | "failures" | "always"; rawOutputMaxBytes: number; rawOutputMaxFiles?: number; rawOutputMaxAgeDays?: number; enableGrouping?: boolean; groupingThreshold?: number; stripCodeComments?: boolean; preserveDocstrings?: boolean; enableRenderers?: boolean; renderers?: string[] }
export interface CompressionLanguageConfig { enabled: boolean; defaultLanguage: string; autoDetect: boolean; enabledPacks: string[] }
export interface ContextEditingConfig { enabled: boolean }
export interface OmniglyphConfig { profile: "coding-safe" | "balanced" | "aggressive" | "passthrough" }
export interface AggressiveConfig { thresholds: { fullSummary: number; moderate: number; light: number; verbatim: number }; toolStrategies: { fileContent: boolean; grepSearch: boolean; shellOutput: boolean; json: boolean; errorMessage: boolean }; summarizerEnabled: boolean; maxTokensPerMessage: number; minSavingsThreshold: number; preserveSystemPrompt?: boolean }
export interface UltraConfig { enabled: boolean; compressionRate: number; minScoreThreshold: number; slmFallbackToAggressive: boolean; modelPath?: string; maxTokensPerMessage: number; preserveSystemPrompt?: boolean }
export interface HeadroomConfig { minRows: number }
export interface SessionDedupConfig { minBlockChars: number; fuzzy: boolean }
export interface CcrConfig { minChars: number; retrievalRampFactor: number }
export interface McpAccessibilityConfig { enabled: boolean; maxTextChars: number; collapseThreshold: number; collapseKeepHead: number; collapseKeepTail: number; minLengthToProcess: number }

export interface CompressionConfig {
  enabled: boolean;
  defaultMode: CompressionMode;
  autoTriggerMode?: CompressionMode;
  autoTriggerTokens: number;
  cacheMinutes: number;
  preserveSystemPrompt: boolean;
  preserveSystemPromptMode?: PreserveSystemPromptMode;
  mcpDescriptionCompressionEnabled?: boolean;
  comboOverrides: Record<string, CompressionMode>;
  compressionComboId?: string | null;
  stackedPipeline?: CompressionPipelineStep[];
  omniglyph?: OmniglyphConfig;
  cavemanConfig?: CavemanConfig;
  cavemanOutputMode?: CavemanOutputModeConfig;
  outputStyles?: OutputStyleSelectionEntry[];
  rtkConfig?: RtkConfig;
  codexResponsesConfig?: CodexResponsesConfig;
  languageConfig?: CompressionLanguageConfig;
  aggressive?: AggressiveConfig;
  ultra?: UltraConfig;
  lite?: { compressToolResults: boolean };
  headroom?: HeadroomConfig;
  sessionDedup?: SessionDedupConfig;
  ccr?: CcrConfig;
  contextEditing?: ContextEditingConfig;
  liveZone?: { enabled: boolean };
  engines: Record<string, EngineToggle>;
  activeComboId: string | null;
  enginesExplicit?: boolean;
  contextBudget?: ContextBudgetConfig;
  targetTokens?: number;
  targetRatio?: number;
  ultraEngine?: "heuristic" | "slm";
  ultraSlmPrewarm?: boolean;
  memoizeCompressionResults?: boolean;
  exclusions?: string[];
  [key: string]: unknown;
}

export const ENGINE_IDS: CompressionEngineId[] = ["session-dedup", "ccr", "lite", "rtk", "codex-responses", "headroom", "relevance", "caveman", "aggressive", "llmlingua", "ultra", "omniglyph"];
export const DEFAULT_CODEX_RESPONSES_CONFIG: CodexResponsesConfig = { enabled: false, minBytes: 512, maxOutputBytes: 2 * 1024 * 1024, maxCandidateBytes: 512 * 1024, maxLines: 160, minSearchMatches: 8, minLogLines: 24, preserveToolNames: ["Read", "Glob", "Grep", "Write", "Edit", "WebSearch", "WebFetch", "read", "glob", "grep", "write", "edit", "web_search", "web_fetch"] };
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = { enabled: false, defaultMode: "off", autoTriggerMode: "lite", autoTriggerTokens: 0, cacheMinutes: 5, preserveSystemPrompt: true, preserveSystemPromptMode: "always", mcpDescriptionCompressionEnabled: true, comboOverrides: {}, compressionComboId: null, stackedPipeline: [{ engine: "rtk", intensity: "standard" }, { engine: "caveman", intensity: "full" }], engines: Object.fromEntries(ENGINE_IDS.map((id) => [id, { enabled: false }])), activeComboId: null, ultraEngine: "heuristic", ultraSlmPrewarm: false, liveZone: { enabled: false }, lite: { compressToolResults: true }, codexResponsesConfig: { ...DEFAULT_CODEX_RESPONSES_CONFIG } };
export const DEFAULT_CAVEMAN_CONFIG: CavemanConfig = { enabled: false, compressRoles: ["user"], skipRules: [], minMessageLength: 50, preservePatterns: ["```[\\s\\S]*?```", "`[^`\\n]+`", "\\b(https?://\\S+)", "(?:^|\\s)(\\.{0,2}/[\\w./\\-]+)", "^\\s*(Error|TypeError|RangeError|SyntaxError|ReferenceError):", "^\\s+at\\s"], intensity: "lite" };
export const DEFAULT_CAVEMAN_OUTPUT_MODE_CONFIG: CavemanOutputModeConfig = { enabled: false, intensity: "lite", autoClarity: true };
export const DEFAULT_RTK_CONFIG: RtkConfig = { enabled: false, intensity: "minimal", applyToToolResults: true, applyToCodeBlocks: false, applyToAssistantMessages: false, enabledFilters: [], disabledFilters: [], maxLinesPerResult: 120, maxCharsPerResult: 12000, deduplicateThreshold: 3, customFiltersEnabled: true, trustProjectFilters: false, rawOutputRetention: "never", rawOutputMaxBytes: 1_048_576, rawOutputMaxFiles: 100_000, rawOutputMaxAgeDays: 30, enableGrouping: false, groupingThreshold: 3, stripCodeComments: false, preserveDocstrings: true, enableRenderers: false };
export const DEFAULT_COMPRESSION_LANGUAGE_CONFIG: CompressionLanguageConfig = { enabled: false, defaultLanguage: "en", autoDetect: true, enabledPacks: ["en"] };
export const DEFAULT_OMNIGLYPH_CONFIG: OmniglyphConfig = { profile: "aggressive" };
export const DEFAULT_CONTEXT_EDITING_CONFIG: ContextEditingConfig = { enabled: false };
export const DEFAULT_AGGRESSIVE_CONFIG: AggressiveConfig = { thresholds: { fullSummary: 5, moderate: 3, light: 2, verbatim: 2 }, toolStrategies: { fileContent: true, grepSearch: true, shellOutput: true, json: true, errorMessage: true }, summarizerEnabled: true, maxTokensPerMessage: 2048, minSavingsThreshold: 0.05 };
export const DEFAULT_ULTRA_CONFIG: UltraConfig = { enabled: false, compressionRate: 0.5, minScoreThreshold: 0.3, slmFallbackToAggressive: true, maxTokensPerMessage: 0 };
export const DEFAULT_HEADROOM_CONFIG: HeadroomConfig = { minRows: 8 };
export const DEFAULT_SESSION_DEDUP_CONFIG: SessionDedupConfig = { minBlockChars: 80, fuzzy: false };
export const DEFAULT_CCR_CONFIG: CcrConfig = { minChars: 600, retrievalRampFactor: 2 };
export const DEFAULT_MCP_ACCESSIBILITY_CONFIG: McpAccessibilityConfig = { enabled: true, maxTextChars: 50000, collapseThreshold: 30, collapseKeepHead: 10, collapseKeepTail: 5, minLengthToProcess: 2000 };
export function clampMcpAccessibilityConfig(raw: unknown): McpAccessibilityConfig {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bounded = (value: unknown, min: number, fallback: number): number => typeof value === "number" && Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
  return { enabled: record.enabled !== false, maxTextChars: bounded(record.maxTextChars, 600, 50000), collapseThreshold: bounded(record.collapseThreshold, 1, 30), collapseKeepHead: bounded(record.collapseKeepHead, 0, 10), collapseKeepTail: bounded(record.collapseKeepTail, 0, 5), minLengthToProcess: bounded(record.minLengthToProcess, 1, 2000) };
}
