import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CloudAgentsController } from "./cloud-agents.controller.js";

@Module({ imports: [CommonModule], controllers: [CloudAgentsController] })
export class CloudAgentsModule {}
