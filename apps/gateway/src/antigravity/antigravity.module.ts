import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AntigravityController } from "./antigravity.controller.js";
import { AntigravityService } from "./antigravity.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AntigravityController],
  providers: [AntigravityService],
})
export class AntigravityModule {}
