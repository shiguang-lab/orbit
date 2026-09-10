import { Module } from "@nestjs/common";
import { LogExportController } from "./log-export.controller.js";
import { LogExportService } from "./log-export.service.js";

@Module({ controllers: [LogExportController], providers: [LogExportService] })
export class LogExportModule {}
