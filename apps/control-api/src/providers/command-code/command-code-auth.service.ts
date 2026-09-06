import { Injectable } from "@nestjs/common";
import { CommandCodeAuthRepository } from "./command-code-auth.repository.js";
import { applyCommandCodeAuth } from "./handlers/apply.handler.js";
import { callbackCommandCodeAuth, optionsCommandCodeCallback } from "./handlers/callback.handler.js";
import { startCommandCodeAuth } from "./handlers/start.handler.js";
import { statusCommandCodeAuth } from "./handlers/status.handler.js";

@Injectable()
export class CommandCodeAuthService {
  constructor(private readonly repository: CommandCodeAuthRepository) {}
  start(request: Request) { return startCommandCodeAuth(request, this.repository); }
  callback(request: Request) { return callbackCommandCodeAuth(request, this.repository); }
  options(request: Request) { return optionsCommandCodeCallback(request); }
  status(request: Request) { return statusCommandCodeAuth(request, this.repository); }
  apply(request: Request) { return applyCommandCodeAuth(request, this.repository); }
}
