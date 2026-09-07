export interface CommandSample {
  command: string;
  output: string;
  createdAt?: number;
  [key: string]: unknown;
}

export interface NoiseCandidate {
  line: string;
  count: number;
  commandTypes: string[];
  [key: string]: unknown;
}

export declare function listRtkCommandSamples(options?: { limit?: number }): CommandSample[];
export declare function discoverRepeatedNoise(samples: CommandSample[]): NoiseCandidate[];
export declare function getRtkFilterCatalog(): Array<Record<string, unknown>>;
export declare function getRtkFilterLoadDiagnostics(): Array<Record<string, unknown>>;
export declare function loadRtkFilters(options?: {
  refresh?: boolean;
  customFiltersEnabled?: boolean;
  trustProjectFilters?: boolean;
}): Array<Record<string, unknown>>;
export interface CommandDetectionResult {
  type: string;
  command: string | null;
  confidence: number;
  category: string;
  matchedPatterns: string[];
}
export declare function detectCommandType(
  text: string,
  command?: string | null,
): CommandDetectionResult;
export interface RtkProcessResult {
  text: string;
  compressed: boolean;
  originalTokens: number;
  compressedTokens: number;
  techniquesUsed: string[];
  rulesApplied: string[];
  rawOutputPointers?: Array<Record<string, unknown>>;
}
export declare function processRtkText(
  text: string,
  options?: { command?: string | null; config?: Record<string, unknown>; skipFilters?: boolean },
): RtkProcessResult;
export declare function readRtkRawOutput(pointerId: string): string | null;
export declare function commandToId(command: string): string;
export interface SuggestedFilter {
  id: string;
  label: string;
  description: string;
  category: string;
  priority: number;
  match: Record<string, unknown>;
  rules: Record<string, unknown>;
  preserve: Record<string, unknown>;
  _meta: Record<string, unknown>;
}
export declare function suggestFilter(command: string, samples: CommandSample[]): SuggestedFilter;
