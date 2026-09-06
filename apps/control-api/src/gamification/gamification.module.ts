import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { GamificationController } from "./gamification.controller.js";
import { GamificationService } from "./gamification.service.js";

@Module({
  imports: [CommonModule],
  controllers: [GamificationController],
  providers: [GamificationService],
})
export class GamificationModule {}
