import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MessagesController } from "./messages.controller.js";
import { MessagesService } from "./messages.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
