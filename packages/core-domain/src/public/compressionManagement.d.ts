export declare const DEFAULT_BENCHMARK_ENGINES: string[];
export declare function benchmarkEngines(
  inputs: Array<{ id: string; input: string }>,
  engineIds: string[],
): Promise<unknown[]>;
export declare function compareReports(reports: unknown[]): unknown[];
export declare function registerBuiltinCompressionEngines(): void;
export declare function listCompressionEngines(): Array<{
  id: string;
  name: string;
  description?: string;
  icon?: string;
  stackable?: boolean;
  stackPriority?: number;
  metadata?: unknown;
  getConfigSchema(): unknown;
}>;
export declare function listCavemanRulePacks(): unknown[];
export declare function listSupportedCompressionLanguages(): string[];
export declare function retrieveBlock(hash: string): string | null;
export declare function queryBlock(
  block: string,
  options: Record<string, unknown>,
): { content: string } | { error: string };
export declare function sanitizeErrorMessage(error: unknown): string;
