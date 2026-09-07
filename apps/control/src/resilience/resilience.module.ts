import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ResilienceController } from "./resilience.controller.js";
import { ResilienceService } from "./resilience.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ResilienceController],
  providers: [ResilienceService],
})
export class ResilienceModule {}
