export declare function clampComboDepth(value: unknown): number;
export declare function validateComboDAG(
  comboName: string,
  combos: unknown[],
  visited?: Set<string>,
  depth?: number,
  maxDepth?: number,
): void;
export declare function resolveNestedComboTargets(combo: unknown, combos: unknown[]): Array<{
  modelStr?: string;
  provider?: string | null;
  providerId?: string | null;
}>;
export declare function resolveComboTargets(
  combo: unknown,
  combos: unknown,
  maxDepth?: number,
  hiddenModelsByProvider?: ReadonlyMap<string, ReadonlySet<string>>,
): Array<{
  modelStr: string;
  provider?: string | null;
  providerId?: string | null;
  connectionId?: string | null;
}>;
