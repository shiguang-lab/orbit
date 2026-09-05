import { Module } from "@nestjs/common";
import { WsController } from "./ws.controller.js";
import { WsService } from "./ws.service.js";

@Module({
  controllers: [WsController],
  providers: [WsService],
  exports: [WsService],
})
export class WsModule {}
