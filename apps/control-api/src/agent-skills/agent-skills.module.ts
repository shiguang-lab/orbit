import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AgentSkillsController } from "./agent-skills.controller.js";
import { AgentSkillsService } from "./agent-skills.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AgentSkillsController],
  providers: [AgentSkillsService],
})
export class AgentSkillsModule {}
