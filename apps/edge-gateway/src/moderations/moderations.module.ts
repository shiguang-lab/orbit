import { Module } from "@nestjs/common";
import { ModerationsController } from "./moderations.controller.js";
import { ModerationsService } from "./moderations.service.js";

@Module({
  controllers: [ModerationsController],
  providers: [ModerationsService],
  exports: [ModerationsService],
})
export class ModerationsModule {}
