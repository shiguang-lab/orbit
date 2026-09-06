import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";
import { SkillsRepository } from "./skills.repository.js";
import { SkillsProviderSettingsService } from "./providers/skills-provider-settings.service.js";
import { SkillsShProvider } from "./providers/skills-sh.provider.js";

@Module({
  imports: [CommonModule],
  controllers: [SkillsController],
  providers: [SkillsService, SkillsRepository, SkillsProviderSettingsService, SkillsShProvider],
})
export class SkillsModule {}
