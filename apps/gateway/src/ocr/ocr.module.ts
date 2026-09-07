import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { OcrController } from "./ocr.controller.js";
import { OcrService } from "./ocr.service.js";

@Module({
  imports: [CommonModule],
  controllers: [OcrController],
  providers: [OcrService],
})
export class OcrModule {}
