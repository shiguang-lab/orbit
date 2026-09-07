import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { BatchesController } from "./batches.controller.js";
import { BatchesService } from "./batches.service.js";

@Module({
  imports: [CommonModule],
  controllers: [BatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}
