import { Injectable } from "@nestjs/common";
import * as auth from "./handlers/auth.handler.js";
import * as credentials from "./handlers/credentials-update.handler.js";
import * as resolve from "./handlers/model-resolve.handler.js";
import * as aliases from "./handlers/models-alias.handler.js";

@Injectable()
export class CloudService {
  auth(request: Request) { return auth.POST(request); }
  updateCredentials(request: Request) { return credentials.PUT(request); }
  resolveModel(request: Request) { return resolve.POST(request); }
  getAliases(request: Request) { return aliases.GET(request); }
  updateAliases(request: Request) { return aliases.PUT(request); }
}
