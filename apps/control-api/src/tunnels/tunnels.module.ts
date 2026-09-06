import { Module } from "@nestjs/common";
import { TunnelsController } from "./tunnels.controller.js";
import { TunnelsService } from "./tunnels.service.js";

@Module({
  controllers: [TunnelsController],
  providers: [TunnelsService],
  exports: [TunnelsService],
})
export class TunnelsModule {}
