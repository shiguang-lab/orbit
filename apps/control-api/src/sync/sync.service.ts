import { Injectable } from "@nestjs/common";
import * as initialize from "./handlers/initialize.handler.js";
import * as bundle from "./handlers/bundle.handler.js";
import * as cloud from "./handlers/cloud.handler.js";
import * as tokens from "./handlers/tokens.handler.js";
import * as tokenById from "./handlers/token-by-id.handler.js";

@Injectable()
export class SyncService {
  initializeGet(_request?: Request) { return initialize.GET(); }
  initializePost(_request?: Request) { return initialize.POST(); }
  bundle(request: Request) { return bundle.GET(request); }
  cloudGet(_request?: Request) { return cloud.GET(); }
  cloudPost(request: Request) { return cloud.POST(request); }
  tokensGet(request: Request) { return tokens.GET(request); }
  tokensPost(request: Request) { return tokens.POST(request); }
  tokenDelete(request: Request, id: string) { return tokenById.DELETE(request, { params: { id } }); }
}
