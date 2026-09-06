export interface ResolvedCodexModelInfo {
  provider?: string | null;
  model?: string | null;
  [key: string]: unknown;
}

export function resolveCodexWsModelInfo(
  requestedModel: string,
  resolve: (model: string) => Promise<ResolvedCodexModelInfo>,
): Promise<ResolvedCodexModelInfo>;
