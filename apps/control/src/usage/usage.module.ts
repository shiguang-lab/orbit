import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { UsageController } from "./usage.controller.js";
import { UsageService } from "./usage.service.js";

@Module({
  imports: [CommonModule],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}
