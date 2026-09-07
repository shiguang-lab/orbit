export interface AutoComboCandidateView {
  provider: string;
  connectionId: string;
  model: string;
  modelStr: string;
  excluded: boolean;
  reachable: boolean;
  breakerState: string;
  connectionCooldown: boolean;
  modelLocked: boolean;
}

export interface AutoComboCandidatesResult {
  channel: string;
  candidates: AutoComboCandidateView[];
}

export function getAutoComboCandidates(
  channel: string,
  apiKeyId: string | null,
): Promise<AutoComboCandidatesResult>;
export function isUnknownAutoChannelError(error: unknown): boolean;
export function buildCandidatesErrorBody(
  statusCode: number,
  message: string,
): { error: { message: string; type?: string; code?: string; reason?: string } };
