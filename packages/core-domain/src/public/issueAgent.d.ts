export function appendIssueAgentAuditRecord(run: any): Promise<{ path: string }>;
export function executeRecordedTriageChatCompletion(input: any, post: (request: Request) => Promise<Response>): Promise<{ status: number; body: unknown }>;
export class RecordedTriageTimeoutError extends Error { constructor(timeoutMs: number); }
export function normalizeGitHubIssueExport(input: unknown): any;
export function createRecordedTriageRun(input: any): any;
