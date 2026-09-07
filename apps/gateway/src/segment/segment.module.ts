import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SegmentController } from "./segment.controller.js";
import { SegmentService } from "./segment.service.js";

@Module({
  imports: [CommonModule],
  controllers: [SegmentController],
  providers: [SegmentService],
})
export class SegmentModule {}
