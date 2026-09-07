import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CompletionsController } from "./completions.controller.js";
import { CompletionsService } from "./completions.service.js";

@Module({
  imports: [CommonModule],
  controllers: [CompletionsController],
  providers: [CompletionsService],
})
export class CompletionsModule {}
