import { handleChat } from "../handlers/chat.ts";
import { handleCorsOptions } from "@orbit/core/shared/cors";

export async function POST(request: Request): Promise<Response> {
  return handleChat(request);
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}
