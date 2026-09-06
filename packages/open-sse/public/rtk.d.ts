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
