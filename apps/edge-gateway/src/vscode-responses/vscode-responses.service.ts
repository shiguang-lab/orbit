import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "../responses/responses.handler.js";
import { rewriteVscodeServiceTierRequest } from "@shiguang-gateway/core-domain/edge/vscode-service-tier";
import { withSanitizedPathTokenApiKey } from "@shiguang-gateway/core-domain/edge/vscode-token";

@Injectable()
export class VscodeResponsesService {
  async post(request: Request, token: string) {
    const authorized = await withSanitizedPathTokenApiKey(request, token);
    return POST(await rewriteVscodeServiceTierRequest(authorized));
  }
  options() { return OPTIONS(); }
}
