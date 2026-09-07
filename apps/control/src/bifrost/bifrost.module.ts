import { Module } from "@nestjs/common";
import { BifrostController } from "./bifrost.controller.js";
import { BifrostService } from "./bifrost.service.js";

@Module({
  controllers: [BifrostController],
  providers: [BifrostService],
  exports: [BifrostService],
})
export class BifrostModule {}
