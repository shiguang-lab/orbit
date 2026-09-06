import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProviderEmbeddingsController } from "./provider-embeddings.controller.js";
import { ProviderEmbeddingsService } from "./provider-embeddings.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderEmbeddingsController],
  providers: [ProviderEmbeddingsService],
})
export class ProviderEmbeddingsModule {}

