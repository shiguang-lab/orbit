import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { LogsController } from "./logs.controller.js";
import { UsageLogsController } from "./usage-logs.controller.js";
import { LogsService } from "./logs.service.js";

@Module({
  imports: [CommonModule],
  controllers: [LogsController, UsageLogsController],
  providers: [LogsService],
})
export class LogsModule {}
