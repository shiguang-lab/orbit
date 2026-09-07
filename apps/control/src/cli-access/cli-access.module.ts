import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CliAccessController } from "./cli-access.controller.js";
import { CliAccessService } from "./cli-access.service.js";

@Module({ imports: [CommonModule], controllers: [CliAccessController], providers: [CliAccessService] })
export class CliAccessModule {}
