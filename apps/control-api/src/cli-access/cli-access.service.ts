import { Injectable } from "@nestjs/common";
import * as connect from "./handlers/connect.handler.js";
import * as tokens from "./handlers/tokens.handler.js";
import * as tokenById from "./handlers/token-by-id.handler.js";
import * as whoami from "./handlers/whoami.handler.js";

@Injectable()
export class CliAccessService {
  connectPost(request: Request) { return connect.POST(request); }
  tokensGet(request: Request) { return tokens.GET(request); }
  tokensPost(request: Request) { return tokens.POST(request); }
  tokenDelete(request: Request, id: string) { return tokenById.DELETE(request, { params: Promise.resolve({ id }) }); }
  whoamiGet(request: Request) { return whoami.GET(request); }
}
