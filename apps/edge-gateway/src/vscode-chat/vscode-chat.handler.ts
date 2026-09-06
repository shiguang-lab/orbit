import { OPTIONS as baseOptions, POST as basePost } from "../chat-completions/handlers/chat-completions.handler.js";
import { withSanitizedPathTokenApiKey } from "@shiguang-gateway/core-domain/edge/vscode-token";

export function OPTIONS(): Response { return baseOptions(); }

export async function POST(request: Request, token: string): Promise<Response> {
  return basePost(await withSanitizedPathTokenApiKey(request, token));
}
