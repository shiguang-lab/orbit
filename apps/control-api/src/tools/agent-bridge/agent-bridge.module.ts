import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { AgentBridgeController } from "./agent-bridge.controller.js";
import { AgentBridgeService } from "./agent-bridge.service.js";

@Module({ imports: [CommonModule], controllers: [AgentBridgeController], providers: [AgentBridgeService] })
export class AgentBridgeModule {}
