import { createResponsesApiTransformStream } from "@shiguang-gateway/open-sse/transformer/responsesTransformer";

export async function transformChatCompletionSseToResponses(rawSse: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(rawSse));
      controller.close();
    },
  });
  const reader = input.pipeThrough(createResponsesApiTransformStream()).getReader();
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}
