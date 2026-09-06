import { Injectable } from "@nestjs/common";
import { SHOW_OPTIONS, SHOW_POST, TAGS, TAGS_OPTIONS } from "./vscode-ollama.handler.js";
import { getUnifiedModelsResponse } from "@shiguang-gateway/open-sse/catalog/unified";

@Injectable()
export class VscodeOllamaService {
  showPost(request: Request, token: string) { return SHOW_POST(request, { params: { token } }, getUnifiedModelsResponse); }
  tags(request: Request, token: string) { return TAGS(request, { params: { token } }, getUnifiedModelsResponse); }
  showOptions() { return SHOW_OPTIONS(); }
  tagsOptions() { return TAGS_OPTIONS(); }
}
