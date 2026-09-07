import { Module } from "@nestjs/common";
import { ModelAliasesController } from "./model-aliases.controller.js";
import { ModelAliasesService } from "./model-aliases.service.js";

@Module({
  controllers: [ModelAliasesController],
  providers: [ModelAliasesService],
})
export class ModelAliasesModule {}
