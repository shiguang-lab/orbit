import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { OllamaChatController } from "./ollama-chat.controller.js";
import { OllamaChatService } from "./ollama-chat.service.js";

@Module({
  imports: [CommonModule],
  controllers: [OllamaChatController],
  providers: [OllamaChatService],
})
export class OllamaChatModule {}
