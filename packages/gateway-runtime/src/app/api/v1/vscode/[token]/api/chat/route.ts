import { POST as basePost, OPTIONS } from "../../../../api/chat/route.ts";
import { withSanitizedPathTokenApiKey } from "../../tokenizedRequest.ts";

export { OPTIONS };

export async function POST(request: Request) {
  return basePost(await withSanitizedPathTokenApiKey(request));
}
