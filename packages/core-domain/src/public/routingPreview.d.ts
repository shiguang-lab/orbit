export function rankCandidates(input: { candidates: Array<Record<string, unknown>> }): {
  selected?: { providerId: string };
  [key: string]: unknown;
};
