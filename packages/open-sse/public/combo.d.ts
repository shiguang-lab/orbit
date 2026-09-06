export declare function clampComboDepth(value: unknown): number;
export declare function validateComboDAG(
  comboName: string,
  combos: unknown[],
  visited?: Set<string>,
  depth?: number,
  maxDepth?: number,
): void;
