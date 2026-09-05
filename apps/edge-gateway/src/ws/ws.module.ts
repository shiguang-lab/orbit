import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { WsController } from "./ws.controller.js";
import { WsService } from "./ws.service.js";

@Module({
  imports: [CommonModule],
  controllers: [WsController],
  providers: [WsService],
})
export class WsModule {}
