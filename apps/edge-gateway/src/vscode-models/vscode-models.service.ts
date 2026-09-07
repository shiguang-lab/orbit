import { Injectable } from "@nestjs/common";
import { GET, GET_RAW, OPTIONS, OPTIONS_RAW } from "./vscode-models.handler.js";
import { getUnifiedModelsResponse } from "@orbit/inference/catalog/unified";

@Injectable()
export class VscodeModelsService {
  get(request: Request, token: string): Promise<Response> {
    return GET(request, { params: { token } }, getUnifiedModelsResponse);
  }

  getRaw(request: Request, token: string): Promise<Response> {
    return GET_RAW(request, { params: { token } }, getUnifiedModelsResponse);
  }

  options(): Response {
    return OPTIONS();
  }

  optionsRaw(): Response {
    return OPTIONS_RAW();
  }
}
