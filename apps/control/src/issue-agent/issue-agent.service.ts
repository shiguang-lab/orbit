import { Injectable } from "@nestjs/common";
import {
  appendIssueAgentAuditRecord, createRecordedTriageRun, executeRecordedTriageChatCompletion,
  normalizeGitHubIssueExport,
} from "./runtime/index.js";
import { forwardEdgeHttpRequest } from "../edge-runtime/client.js";
export { RecordedTriageTimeoutError } from "./runtime/execution.js";

@Injectable()
export class IssueAgentService {
  append(run: Parameters<typeof appendIssueAgentAuditRecord>[0]) { return appendIssueAgentAuditRecord(run); }
  create(input: Parameters<typeof createRecordedTriageRun>[0]) { return createRecordedTriageRun(input); }
  normalize(input: unknown) { return normalizeGitHubIssueExport(input); }
  execute(input: Parameters<typeof executeRecordedTriageChatCompletion>[0]) { return executeRecordedTriageChatCompletion(input, forwardEdgeHttpRequest); }
}
