import { Module } from "@nestjs/common";
import { QuotaSettingsController } from "./quota-store.controller.js";
import { QuotaStateController } from "./quota-state.controller.js";
import { QuotaSettingsService, QuotaStateService } from "./quota.service.js";

/** Control-plane module for quota store configuration and quota state diagnostics. */
@Module({
  controllers: [QuotaSettingsController, QuotaStateController],
  providers: [QuotaSettingsService, QuotaStateService],
})
export class QuotaSettingsModule {}
