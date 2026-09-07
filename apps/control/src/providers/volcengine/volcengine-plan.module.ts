import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { VolcenginePlanController } from "./volcengine-plan.controller.js";
import { VolcenginePlanService } from "./volcengine-plan.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VolcenginePlanController],
  providers: [VolcenginePlanService],
})
export class VolcenginePlanModule {}
