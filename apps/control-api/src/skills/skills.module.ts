import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";
import { SkillsRepository } from "./skills.repository.js";

@Module({
  imports: [CommonModule],
  controllers: [SkillsController],
  providers: [SkillsService, SkillsRepository],
})
export class SkillsModule {}
