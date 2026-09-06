import { Injectable } from "@nestjs/common";
import * as lifecycle from "./handlers/lifecycle.js";
import { accounts } from "./handlers/accounts.js";
import { toggle } from "./handlers/toggles.js";
import { installService } from "./handlers/install.js";
import * as login from "./handlers/login.js";

@Injectable()
export class CliproxyService {
  accounts(request: Request) { return accounts(request); }
  install(request: Request) { return installService(request); }
  autoStart(request: Request) { return toggle(request, "autoStart"); }
  autoRestartAdopted(request: Request) { return toggle(request, "autoRestartAdopted"); }
  providerExpose(request: Request) { return toggle(request, "providerExpose"); }
  start() { return lifecycle.start(); }
  restart() { return lifecycle.restart(); }
  stop() { return lifecycle.stop(); }
  status() { return lifecycle.status(); }
  update() { return lifecycle.update(); }
  loginStart(request: Request) { return login.start(request); }
  loginGet(request: Request, id: string) { return login.get(request, id); }
  loginCancel(request: Request, id: string) { return login.cancel(request, id); }
}
