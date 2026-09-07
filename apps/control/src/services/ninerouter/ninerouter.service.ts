import { Injectable } from "@nestjs/common";
import { models } from "./handlers/models.js";
import { install } from "./handlers/install.js";
import { status } from "./handlers/status.js";
import { toggle } from "./handlers/toggles.js";
import * as lifecycle from "./handlers/lifecycle.js";

@Injectable()
export class NinerouterService {
  status(request: Request) { return status(request); }
  models(request: Request) { return models(request); }
  install(request: Request) { return install(request); }
  autoStart(request: Request) { return toggle(request, "autoStart"); }
  autoRestartAdopted(request: Request) { return toggle(request, "autoRestartAdopted"); }
  providerExpose(request: Request) { return toggle(request, "providerExpose"); }
  start() { return lifecycle.start(); }
  restart() { return lifecycle.restart(); }
  stop() { return lifecycle.stop(); }
  rotateKey() { return lifecycle.rotateKey(); }
  update() { return lifecycle.update(); }
  getOrInitSupervisor() { return lifecycle.getOrInitSupervisor(); }
}
