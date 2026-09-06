import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CliToolsController } from "./cli-tools.controller.js";
import { CliToolsService } from "./cli-tools.service.js";

@Module({
  imports: [CommonModule],
  controllers: [CliToolsController],
  providers: [CliToolsService],
})
export class CliToolsModule {}
