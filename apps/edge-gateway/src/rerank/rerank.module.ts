import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RerankController } from "./rerank.controller.js";
import { RerankService } from "./rerank.service.js";

@Module({
  imports: [CommonModule],
  controllers: [RerankController],
  providers: [RerankService],
})
export class RerankModule {}
