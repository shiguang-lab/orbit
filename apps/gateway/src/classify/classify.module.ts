import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ClassifyController } from "./classify.controller.js";
import { ClassifyService } from "./classify.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ClassifyController],
  providers: [ClassifyService],
})
export class ClassifyModule {}
