import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AgentCardController } from "./agent-card.controller.js";
import { AgentCardService } from "./agent-card.service.js";

@Module({ imports: [CommonModule], controllers: [AgentCardController], providers: [AgentCardService] })
export class AgentCardModule {}
