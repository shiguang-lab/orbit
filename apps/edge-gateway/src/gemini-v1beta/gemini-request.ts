interface GeminiFunctionCall {
  name?: string;
  args?: Record<string, unknown>;
  id?: string;
}
interface GeminiFunctionResponse {
  name?: string;
  id?: string;
  response?: { result?: unknown } & Record<string, unknown>;
}
interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
  [key: string]: unknown;
}
interface GeminiContent { role?: string; parts?: GeminiPart[] }
interface GeminiTool {
  functionDeclarations?: Array<{ name?: string; description?: string; parameters?: unknown }>;
}
interface GeminiGenerateBody {
  systemInstruction?: { parts?: GeminiPart[] };
  contents?: GeminiContent[];
  tools?: GeminiTool[];
  generationConfig?: { maxOutputTokens?: number; temperature?: number; topP?: number };
}
interface InternalMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}
interface InternalTool {
  type: "function";
  function: { name: string; description: string; parameters: unknown };
}
export interface InternalChatBody {
  model: string;
  messages: InternalMessage[];
  stream: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  tools?: InternalTool[];
}

let toolCallSeq = 0;
function newToolCallId(): string {
  toolCallSeq += 1;
  return `call_${Date.now()}_${toolCallSeq}_${Math.random().toString(36).slice(2, 8)}`;
}

function convertContent(content: GeminiContent): InternalMessage | null {
  const parts = content.parts;
  if (!parts || !Array.isArray(parts)) return null;
  for (const part of parts) {
    if (part.functionResponse) {
      const response = part.functionResponse;
      const payload = response.response && "result" in response.response
        ? response.response.result
        : response.response ?? {};
      return {
        role: "tool",
        tool_call_id: response.id || response.name || "",
        content: JSON.stringify(payload ?? {}),
      };
    }
  }

  const textSegments: string[] = [];
  const toolCalls: NonNullable<InternalMessage["tool_calls"]> = [];
  for (const part of parts) {
    if (typeof part.text === "string") textSegments.push(part.text);
    if (part.functionCall) {
      toolCalls.push({
        id: part.functionCall.id || newToolCallId(),
        type: "function",
        function: {
          name: part.functionCall.name || "",
          arguments: JSON.stringify(part.functionCall.args || {}),
        },
      });
    }
  }
  const text = textSegments.join("\n");
  if (toolCalls.length > 0) {
    return { role: "assistant", ...(text ? { content: text } : {}), tool_calls: toolCalls };
  }
  return { role: content.role === "model" ? "assistant" : "user", content: text };
}

export function convertGeminiToInternal(
  geminiBody: GeminiGenerateBody,
  model: string,
  stream: boolean,
): InternalChatBody {
  const messages: InternalMessage[] = [];
  const systemText = geminiBody.systemInstruction?.parts?.map((part) => part.text ?? "").join("\n") || "";
  if (systemText) messages.push({ role: "system", content: systemText });
  for (const content of geminiBody.contents ?? []) {
    const converted = convertContent(content);
    if (converted) messages.push(converted);
  }
  const result: InternalChatBody = {
    model,
    messages,
    stream,
    max_tokens: geminiBody.generationConfig?.maxOutputTokens,
    temperature: geminiBody.generationConfig?.temperature,
    top_p: geminiBody.generationConfig?.topP,
  };
  const tools: InternalTool[] = [];
  for (const tool of geminiBody.tools ?? []) {
    for (const declaration of tool.functionDeclarations ?? []) {
      tools.push({
        type: "function",
        function: {
          name: declaration.name || "",
          description: declaration.description || "",
          parameters: declaration.parameters || { type: "object", properties: {} },
        },
      });
    }
  }
  if (tools.length > 0) result.tools = tools;
  return result;
}
