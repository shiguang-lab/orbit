import { Injectable } from "@nestjs/common";
import * as root from "./handlers/root.handler.js";
import * as byId from "./handlers/by-id.handler.js";
import * as install from "./handlers/install.handler.js";
import * as marketplace from "./handlers/marketplace.handler.js";
import * as marketplaceInstall from "./handlers/marketplace-install.handler.js";
import * as skillssh from "./handlers/skillssh.handler.js";
import * as skillsshInstall from "./handlers/skillssh-install.handler.js";
import * as collectDetect from "./handlers/collect-detect.handler.js";
import { SkillsRepository } from "./skills.repository.js";
import { SkillsProviderSettingsService } from "./providers/skills-provider-settings.service.js";
import { SkillsShProvider } from "./providers/skills-sh.provider.js";
import * as collectInstall from "./handlers/collect-install.handler.js";

/** Skills management use cases. HTTP transport is owned by SkillsController. */
@Injectable()
export class SkillsService {
  constructor(
    private readonly repository: SkillsRepository,
    private readonly providerSettings: SkillsProviderSettingsService,
    private readonly skillsSh: SkillsShProvider,
  ) {}

  list(request: Request) { return root.GET(request, this.providerSettings); }
  install(request: Request) { return install.POST(request); }
  update(request: Request, id: string) {
    return byId.PUT(request, { params: { id } }, this.repository);
  }
  remove(request: Request, id: string) { return byId.DELETE(request, { params: { id } }); }
  marketplace(request: Request) { return marketplace.GET(request, this.providerSettings); }
  marketplaceInstall(request: Request) { return marketplaceInstall.POST(request, this.providerSettings); }
  skillssh(request: Request) { return skillssh.GET(request, this.skillsSh); }
  skillsshInstall(request: Request) { return skillsshInstall.POST(request, this.skillsSh, this.providerSettings); }
  collectDetect(request: Request) { return collectDetect.GET(request); }
  collectInstall(request: Request) { return collectInstall.POST(request); }
}
