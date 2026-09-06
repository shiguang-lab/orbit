import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { EmbeddedServiceLogsController } from "./embedded-service-logs.controller.js";
import { EmbeddedServiceLogsService } from "./embedded-service-logs.service.js";

@Module({ imports: [CommonModule], controllers: [EmbeddedServiceLogsController], providers: [EmbeddedServiceLogsService] })
export class EmbeddedServiceLogsModule {}
