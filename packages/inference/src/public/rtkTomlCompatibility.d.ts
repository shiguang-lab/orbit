export interface RtkTomlTestOutcome {
  filterId: string;
  testName: string;
  passed: boolean;
  actual: string;
  expected: string;
}

export interface RtkTomlFilterSummary {
  id: string;
  description: string;
  category: string;
  commandPatterns: string[];
  tests: Array<Record<string, unknown>>;
}

export interface RtkTomlCompatibilityResult {
  schemaVersion: 1;
  sha256: string;
  filters: RtkTomlFilterSummary[];
  outcomes: RtkTomlTestOutcome[];
  filtersWithoutTests: string[];
  warnings: string[];
  passed: boolean;
}

export declare class RtkTomlCompatibilityError extends Error {
  readonly publicMessage: string;
}

export declare function parseRtkTomlV1(content: string): RtkTomlCompatibilityResult;
export declare function installGlobalRtkTomlV1(
  content: string,
  options?: { overwrite?: boolean },
): RtkTomlCompatibilityResult & { installedPath: string; backupCreated: boolean };
export declare const RTK_TOML_MAX_BYTES: number;
