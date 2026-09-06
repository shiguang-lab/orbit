import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CopilotController } from "./copilot.controller.js";
import { CopilotService } from "./copilot.service.js";
@Module({ imports: [CommonModule], controllers: [CopilotController], providers: [CopilotService] })
export class CopilotModule {}
