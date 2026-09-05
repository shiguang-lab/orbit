import { Module } from "@nestjs/common";
import { RerankController } from "./rerank.controller.js";
import { RerankService } from "./rerank.service.js";

@Module({
  controllers: [RerankController],
  providers: [RerankService],
  exports: [RerankService],
})
export class RerankModule {}
