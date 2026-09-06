import { Module } from "@nestjs/common";
import { MitmController } from "./mitm.controller.js";
import { MitmService } from "./mitm.service.js";

@Module({
  controllers: [MitmController],
  providers: [MitmService],
})
export class MitmModule {}
