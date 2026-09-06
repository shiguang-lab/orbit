import { Module } from "@nestjs/common";
import { FreeModelsController } from "./free-models.controller.js";
import { FreeModelsService } from "./free-models.service.js";

@Module({ controllers: [FreeModelsController], providers: [FreeModelsService] })
export class FreeModelsModule {}
