export interface CavemanRuleMetadata {
  name: string;
  context: string;
  category: string;
  minIntensity: "lite" | "full" | "ultra";
  intensities: Array<"lite" | "full" | "ultra">;
  description: string;
}

export function getCavemanRuleMetadata(): CavemanRuleMetadata[];
