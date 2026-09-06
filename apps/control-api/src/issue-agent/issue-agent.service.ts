import { Injectable } from "@nestjs/common";
import {
  appendIssueAgentAuditRecord, createRecordedTriageRun, executeRecordedTriageChatCompletion,
  normalizeGitHubIssueExport,
} from "@shiguang-gateway/core-domain/control/issue-agent";
import { POST as postChatCompletion } from "@shiguang-gateway/open-sse/services/chat-completions-compat";
export { RecordedTriageTimeoutError } from "@shiguang-gateway/core-domain/control/issue-agent";

@Injectable()
export class IssueAgentService {
  append(run: Parameters<typeof appendIssueAgentAuditRecord>[0]) { return appendIssueAgentAuditRecord(run); }
  create(input: Parameters<typeof createRecordedTriageRun>[0]) { return createRecordedTriageRun(input); }
  normalize(input: unknown) { return normalizeGitHubIssueExport(input); }
  execute(input: Parameters<typeof executeRecordedTriageChatCompletion>[0]) { return executeRecordedTriageChatCompletion(input, postChatCompletion); }
}
