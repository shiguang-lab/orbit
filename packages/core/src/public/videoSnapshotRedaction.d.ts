export function redactVideoTranscriptFieldsForLog(body: unknown): unknown;
export interface VideoBridgeLogRedactionEntry {
  container: "messages" | "input";
  messageIndex: number;
  partIndex: number;
  fullText: string;
  redactedText: string;
}
export function reanchorVideoBridgeRedaction(
  entries: readonly VideoBridgeLogRedactionEntry[],
  finalBody: unknown
): VideoBridgeLogRedactionEntry[];
