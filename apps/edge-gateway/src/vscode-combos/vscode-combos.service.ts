import { Injectable } from "@nestjs/common";
import { GET, OPTIONS, POST } from "@shiguang-gateway/core-domain/edge/vscode-combos";
import { GET as GET_TOKEN, OPTIONS as OPTIONS_TOKEN } from "@shiguang-gateway/core-domain/edge/vscode-token-combos";

@Injectable()
export class VscodeCombosService {
  get(request: Request, token: string, slug: string[] = []) { return GET(request, { params: { token, slug } }); }
  post(request: Request, token: string, slug: string[] = []) { return POST(request, { params: { token, slug } }); }
  options() { return OPTIONS(); }
  getToken(request: Request, token: string) { return GET_TOKEN(request, { params: { token } }); }
  optionsToken() { return OPTIONS_TOKEN(); }
}
