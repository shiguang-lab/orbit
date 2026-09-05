import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { EmbeddingsController } from "./embeddings.controller.js";
import { EmbeddingsService } from "./embeddings.service.js";

@Module({
  imports: [CommonModule],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService],
})
export class EmbeddingsModule {}
