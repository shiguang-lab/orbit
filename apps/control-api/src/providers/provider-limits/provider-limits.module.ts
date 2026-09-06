import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { ProviderLimitsController } from "./provider-limits.controller.js";
import { ProviderLimitsService } from "./provider-limits.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderLimitsController],
  providers: [ProviderLimitsService],
})
export class ProviderLimitsModule {}
