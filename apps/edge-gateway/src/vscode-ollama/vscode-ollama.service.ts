import { Injectable } from "@nestjs/common";
import { SHOW, SHOW_OPTIONS, SHOW_POST, TAGS, TAGS_OPTIONS } from "@shiguang-gateway/core-domain/edge/vscode-ollama";

@Injectable()
export class VscodeOllamaService {
  show(request: Request, token: string) { return SHOW(request, { params: { token } }); }
  showPost(request: Request, token: string) { return SHOW_POST(request, { params: { token } }); }
  tags(request: Request, token: string) { return TAGS(request, { params: { token } }); }
  showOptions() { return SHOW_OPTIONS(); }
  tagsOptions() { return TAGS_OPTIONS(); }
}
