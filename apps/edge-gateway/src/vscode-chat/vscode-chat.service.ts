import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./vscode-chat.handler.js";

@Injectable()
export class VscodeChatService {
  post(request: Request, token: string) { return POST(request, token); }
  options() { return OPTIONS(); }
}
