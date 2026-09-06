import { Injectable } from "@nestjs/common";
import { GET, GET_RAW, OPTIONS, OPTIONS_RAW } from "@shiguang-gateway/core-domain/edge/vscode-models";

@Injectable()
export class VscodeModelsService {
  get(request: Request, token: string): Promise<Response> {
    return GET(request, { params: { token } });
  }

  getRaw(request: Request, token: string): Promise<Response> {
    return GET_RAW(request, { params: { token } });
  }

  options(): Response {
    return OPTIONS();
  }

  optionsRaw(): Response {
    return OPTIONS_RAW();
  }
}
