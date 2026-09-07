import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProviderChatController } from "./provider-chat.controller.js";
import { ProviderChatService } from "./provider-chat.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderChatController],
  providers: [ProviderChatService],
})
export class ProviderChatModule {}
