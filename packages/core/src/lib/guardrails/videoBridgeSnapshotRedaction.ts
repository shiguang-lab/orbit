const REDACTION_PLACEHOLDER = "[redacted-video-transcript]";
const TRANSCRIPT_FIELDS = ["transcript", "audioTranscript"] as const;
const NESTED_KEYS = ["video_url", "source"] as const;

type UnknownRecord = Record<string, unknown>;

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
): VideoBridgeLogRedactionEntry[] {
  const body = finalBody as UnknownRecord | null | undefined;
  return entries.map((entry) => {
    const container = body?.[entry.container];
    if (!Array.isArray(container)) return { ...entry };
    const message = container[entry.messageIndex] as { content?: unknown } | undefined;
    if (!Array.isArray(message?.content)) return { ...entry };
    const part = message.content[entry.partIndex] as { text?: unknown } | undefined;
    if (typeof part?.text !== "string") return { ...entry };
    return { ...entry, fullText: part.text };
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function redactPart(part: unknown): void {
  if (!isRecord(part)) return;
  const candidates: UnknownRecord[] = [part];
  for (const key of NESTED_KEYS) if (isRecord(part[key])) candidates.push(part[key]);
  for (const candidate of candidates) {
    for (const field of TRANSCRIPT_FIELDS) {
      if (candidate[field] !== undefined) candidate[field] = REDACTION_PLACEHOLDER;
    }
  }
}

function redactContainer(value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const message of value) {
    if (!isRecord(message) || !Array.isArray(message.content)) continue;
    for (const part of message.content) redactPart(part);
  }
}

/** Clone and redact video-only transcript cue fields for logs and live request snapshots. */
export function redactVideoTranscriptFieldsForLog(body: unknown): unknown {
  if (!isRecord(body)) return body;
  const clone = structuredClone(body) as UnknownRecord;
  redactContainer(clone.messages);
  redactContainer(clone.input);
  return clone;
}
