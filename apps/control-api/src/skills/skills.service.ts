import { Injectable } from "@nestjs/common";
import * as root from "./handlers/root.handler.js";
import * as byId from "./handlers/by-id.handler.js";
import * as install from "./handlers/install.handler.js";
import * as marketplace from "./handlers/marketplace.handler.js";
import * as marketplaceInstall from "./handlers/marketplace-install.handler.js";
import * as skillssh from "./handlers/skillssh.handler.js";
import * as skillsshInstall from "./handlers/skillssh-install.handler.js";
import * as collectDetect from "./handlers/collect-detect.handler.js";
import * as collectInstall from "./handlers/collect-install.handler.js";

/** Skills management use cases. HTTP transport is owned by SkillsController. */
@Injectable()
export class SkillsService {
  list(request: Request) { return root.GET(request); }
  install(request: Request) { return install.POST(request); }
  update(request: Request, id: string) { return byId.PUT(request, { params: Promise.resolve({ id }) }); }
  remove(request: Request, id: string) { return byId.DELETE(request, { params: Promise.resolve({ id }) }); }
  marketplace(request: Request) { return marketplace.GET(request); }
  marketplaceInstall(request: Request) { return marketplaceInstall.POST(request); }
  skillssh(request: Request) { return skillssh.GET(request); }
  skillsshInstall(request: Request) { return skillsshInstall.POST(request); }
  collectDetect(request: Request) { return collectDetect.GET(request); }
  collectInstall(request: Request) { return collectInstall.POST(request); }
}
