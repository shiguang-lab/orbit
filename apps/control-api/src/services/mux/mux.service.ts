import { Injectable } from "@nestjs/common";
import * as lifecycle from "./handlers/lifecycle.js";
import { install } from "./handlers/install.js";
import { toggle } from "./handlers/toggles.js";

@Injectable()
export class MuxService {
  install(request: Request) { return install(request); }
  autoStart(request: Request) { return toggle(request, "autoStart"); }
  autoRestartAdopted(request: Request) { return toggle(request, "autoRestartAdopted"); }
  start() { return lifecycle.start(); }
  restart() { return lifecycle.restart(); }
  stop() { return lifecycle.stop(); }
  status() { return lifecycle.status(); }
  update() { return lifecycle.update(); }
}
