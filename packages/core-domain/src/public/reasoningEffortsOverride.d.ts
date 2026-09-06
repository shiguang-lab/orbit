export type ReasoningEffortOverrideValue = "none" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
export type ReasoningEffortsOverrideParseResult =
  | { ok: true; efforts: ReasoningEffortOverrideValue[] }
  | { ok: false; error: string };
export function parseReasoningEffortsOverride(value: unknown): ReasoningEffortsOverrideParseResult;
