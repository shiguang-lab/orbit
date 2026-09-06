export interface MultiTurnConversationRow {
  id: string;
  apiKeyId: string | null;
  fingerprintHash: string;
  turnCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastCallLogId: string | null;
  lastModel: string | null;
  lastProvider: string | null;
  lastStatus: number | null;
}
export interface ConversationTurnNodeWithSeq {
  seq: number;
  id: string;
  conversationId: string;
  parentId: string | null;
  role: string;
  contentHash: string;
  lastCorrelationId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}
export interface ConversationTurnPage {
  nodes: ConversationTurnNodeWithSeq[];
  hasMore: boolean;
}
export interface PendingRequestDetail {
  id: string;
  sessionTag?: string | null;
  [key: string]: unknown;
}
export function listMultiTurnConversations(filter?: { limit?: number; offset?: number }): {
  rows: MultiTurnConversationRow[];
  total: number;
};
export function getConversationTurnPage(
  id: string,
  options?: { limit?: number; beforeSeq?: number; afterSeq?: number },
): ConversationTurnPage;
export function getPendingById(): Map<string, PendingRequestDetail>;
export interface TurnDisplayContent {
  textPreview: string;
  blockKind: "text" | "tool_use" | "tool_result";
  toolName: string | null;
}
export function resolveTurnDisplayContent(
  nodes: ReadonlyArray<{ lastCorrelationId: string | null; contentHash?: string }>,
): Map<string, TurnDisplayContent>;
