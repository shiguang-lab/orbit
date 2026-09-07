import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { SuggestedModelsController } from "./suggested-models.controller.js";
import { SuggestedModelsService } from "./suggested-models.service.js";

@Module({
  imports: [CommonModule],
  controllers: [SuggestedModelsController],
  providers: [SuggestedModelsService],
})
export class SuggestedModelsModule {}
