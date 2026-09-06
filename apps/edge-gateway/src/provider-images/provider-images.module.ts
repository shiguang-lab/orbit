import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProviderImagesController } from "./provider-images.controller.js";
import { ProviderImagesService } from "./provider-images.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderImagesController],
  providers: [ProviderImagesService],
})
export class ProviderImagesModule {}
