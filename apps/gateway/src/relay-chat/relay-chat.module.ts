import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RelayChatController } from "./relay-chat.controller.js";
import { RelayChatService } from "./relay-chat.service.js";

@Module({
  imports: [CommonModule],
  controllers: [RelayChatController],
  providers: [RelayChatService],
})
export class RelayChatModule {}
