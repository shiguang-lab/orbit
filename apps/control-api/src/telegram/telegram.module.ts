import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";

@Module({
  imports: [CommonModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
