import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "../responses/responses.handler.js";
import { rewriteVscodeServiceTierRequest } from "../vscode/runtime/service-tier-variants.js";
import { withSanitizedPathTokenApiKey } from "../vscode/runtime/tokenized-request.js";

@Injectable()
export class VscodeResponsesService {
  async post(request: Request, token: string) {
    const authorized = await withSanitizedPathTokenApiKey(request, token);
    return POST(await rewriteVscodeServiceTierRequest(authorized));
  }
  options() { return OPTIONS(); }
}
