import { Injectable } from "@nestjs/common";
import { GET, OPTIONS, POST } from "@shiguang-gateway/core-domain/edge/vscode-combos";
import { GET as GET_TOKEN, OPTIONS as OPTIONS_TOKEN } from "./token-combos.js";
import { getUnifiedModelsResponse } from "@shiguang-gateway/open-sse/catalog/unified";

@Injectable()
export class VscodeCombosService {
  get(request: Request, token: string, slug: string[] = []) { return GET(request, { params: { token, slug } }, getUnifiedModelsResponse); }
  post(request: Request, token: string, slug: string[] = []) { return POST(request, { params: { token, slug } }, getUnifiedModelsResponse); }
  options() { return OPTIONS(); }
  getToken(request: Request, token: string) { return GET_TOKEN(request, { params: { token } }, getUnifiedModelsResponse); }
  optionsToken() { return OPTIONS_TOKEN(); }
}
