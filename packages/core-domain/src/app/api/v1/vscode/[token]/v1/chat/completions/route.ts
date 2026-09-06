import { POST as basePost, OPTIONS } from "../../../../../../../../lib/edge/chatCompletionsCompat.ts";
import { rewriteVscodeServiceTierRequest } from "../../../serviceTierVariants.ts";
import { withSanitizedPathTokenApiKey } from "../../../tokenizedRequest.ts";

export { OPTIONS };

export async function POST(request: Request) {
  const authorizedRequest = await withSanitizedPathTokenApiKey(request);
  return basePost(await rewriteVscodeServiceTierRequest(authorizedRequest));
}
