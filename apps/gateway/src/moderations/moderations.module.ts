import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ModerationsController } from "./moderations.controller.js";
import { ModerationsService } from "./moderations.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ModerationsController],
  providers: [ModerationsService],
})
export class ModerationsModule {}
