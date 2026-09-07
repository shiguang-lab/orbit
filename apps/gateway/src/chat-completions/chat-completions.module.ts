import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ChatCompletionsController } from "./chat-completions.controller.js";
import { ChatCompletionsService } from "./chat-completions.service.js";

@Module({ imports: [CommonModule], controllers: [ChatCompletionsController], providers: [ChatCompletionsService] })
export class ChatCompletionsModule {}
