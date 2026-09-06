import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ModelsController } from "./models.controller.js";
import { ModelsService } from "./models.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
