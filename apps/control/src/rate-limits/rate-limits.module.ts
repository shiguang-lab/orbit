import { Module } from "@nestjs/common";
import { RateLimitsController } from "./rate-limits.controller.js";
import { LegacyRateLimitController } from "./legacy-rate-limit.controller.js";
import { RateLimitsService } from "./rate-limits.service.js";

@Module({
  controllers: [RateLimitsController, LegacyRateLimitController],
  providers: [RateLimitsService],
})
export class RateLimitsModule {}
