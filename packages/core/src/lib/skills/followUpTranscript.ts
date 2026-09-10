export const MAX_RESULT_BYTES_PER_TOOL = 32_768;
export const MAX_RESULT_BYTES_TOTAL = 65_536;

export type FollowUpToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type FollowUpToolResult = { id: string; name: string; result: unknown };

export type BoundedToolResult = {
  text: string;
  truncated: boolean;
  originalBytes: number;
};

function utf8Prefix(text: string, maxBytes: number): string {
  let output = "";
  let bytes = 0;
  for (const codePoint of text) {
    const width = Buffer.byteLength(codePoint, "utf8");
    if (bytes + width > maxBytes) break;
    output += codePoint;
    bytes += width;
  }
  return output;
}

export function serializeBoundedToolResult(value: unknown, maxBytes: number): BoundedToolResult {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes must be a non-negative safe integer");
  }

  let text: string | undefined;
  try {
    const projected =
      value === undefined
        ? null
        : value instanceof Error
          ? { error: value.message }
          : typeof value === "bigint"
            ? value.toString()
            : value;
    text = JSON.stringify(projected);
  } catch {
    text = undefined;
  }
  if (typeof text !== "string") {
    text = JSON.stringify({ error: "Tool result is not JSON-serializable" });
  }

  const originalBytes = Buffer.byteLength(text, "utf8");
  if (originalBytes <= maxBytes) return { text, truncated: false, originalBytes };

  const fullMarker = `[TRUNCATED ${originalBytes} BYTES BY ORBIT]`;
  const markerBytes = Buffer.byteLength(fullMarker, "utf8");
  if (markerBytes >= maxBytes) {
    return { text: utf8Prefix(fullMarker, maxBytes), truncated: true, originalBytes };
  }
  const prefix = utf8Prefix(text, maxBytes - markerBytes);
  const dropped = originalBytes - Buffer.byteLength(prefix, "utf8");
  return {
    text: prefix + `[TRUNCATED ${dropped} BYTES BY ORBIT]`,
    truncated: true,
    originalBytes,
  };
}

function validatePairs(calls: FollowUpToolCall[], results: FollowUpToolResult[]): void {
  if (calls.length !== results.length) throw new Error("tool calls and results must have equal length");
  const callsById = new Map(calls.map((call) => [call.id, call]));
  if (callsById.size !== calls.length || new Set(results.map((result) => result.id)).size !== results.length) {
    throw new Error("tool call and result ids must be unique");
  }
  for (const result of results) {
    const call = callsById.get(result.id);
    if (!call) throw new Error(`missing tool call for result ${result.id}`);
    if (call.name !== result.name) throw new Error(`tool name mismatch for ${result.id}`);
  }
}

function openAiMessage(response: Record<string, unknown>): Record<string, unknown> | null {
  const choice = Array.isArray(response.choices) ? response.choices[0] : null;
  if (!choice || typeof choice !== "object" || Array.isArray(choice)) return null;
  const message = (choice as Record<string, unknown>).message;
  return message && typeof message === "object" && !Array.isArray(message)
    ? (message as Record<string, unknown>)
    : null;
}

export function buildFollowUpSourceBody(input: {
  sourceBody: Record<string, unknown>;
  previousResponse: Record<string, unknown>;
  toolCalls: FollowUpToolCall[];
  results: FollowUpToolResult[];
  sourceFormat: "openai" | "claude";
  maxResultBytes?: number;
  maxTotalResultBytes?: number;
}): Record<string, unknown> {
  if (!Array.isArray(input.sourceBody.messages)) {
    throw new Error("server-owned tool follow-up requires a messages array");
  }
  validatePairs(input.toolCalls, input.results);

  let remaining = input.maxTotalResultBytes ?? MAX_RESULT_BYTES_TOTAL;
  const bounded = input.results.map((result) => {
    const item = serializeBoundedToolResult(
      result.result,
      Math.min(input.maxResultBytes ?? MAX_RESULT_BYTES_PER_TOOL, Math.max(0, remaining))
    );
    remaining -= Buffer.byteLength(item.text, "utf8");
    return item;
  });
  const messages = [...input.sourceBody.messages];

  if (input.sourceFormat === "openai") {
    const previousMessage = openAiMessage(input.previousResponse);
    const originalCalls = Array.isArray(previousMessage?.tool_calls)
      ? previousMessage.tool_calls
      : input.toolCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        }));
    messages.push({
      role: "assistant",
      content: previousMessage?.content ?? null,
      tool_calls: originalCalls,
    });
    input.results.forEach((result, index) => {
      messages.push({ role: "tool", tool_call_id: result.id, content: bounded[index].text });
    });
    return { ...input.sourceBody, messages, stream: false };
  }

  const content = Array.isArray(input.previousResponse.content)
    ? input.previousResponse.content
    : input.toolCalls.map((call) => ({
        type: "tool_use",
        id: call.id,
        name: call.name,
        input: call.arguments,
      }));
  messages.push({ role: "assistant", content });
  messages.push({
    role: "user",
    content: input.results.map((result, index) => ({
      type: "tool_result",
      tool_use_id: result.id,
      content: bounded[index].text,
    })),
  });
  return { ...input.sourceBody, messages };
}
