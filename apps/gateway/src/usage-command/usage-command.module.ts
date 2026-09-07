import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { UsageCommandController } from "./usage-command.controller.js";
import { UsageCommandService } from "./usage-command.service.js";

@Module({ imports: [CommonModule], controllers: [UsageCommandController], providers: [UsageCommandService] })
export class UsageCommandModule {}
