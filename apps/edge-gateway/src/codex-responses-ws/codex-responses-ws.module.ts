import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CodexResponsesWsController } from "./codex-responses-ws.controller.js";
import { CodexResponsesWsService } from "./codex-responses-ws.service.js";

@Module({
  imports: [CommonModule],
  controllers: [CodexResponsesWsController],
  providers: [CodexResponsesWsService],
})
export class CodexResponsesWsModule {}
