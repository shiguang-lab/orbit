import { redactVideoTranscriptFieldsForLog } from "@orbit/core/guardrails/video-snapshot-redaction";

export function redactRejectedRequestBodyForLog(requestBody: unknown): unknown {
  return requestBody == null ? requestBody : redactVideoTranscriptFieldsForLog(requestBody);
}
