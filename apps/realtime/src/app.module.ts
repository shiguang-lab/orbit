import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module.js";
import { LiveModule } from "./modules/live/live.module.js";

@Module({
  imports: [HealthModule, LiveModule],
})
export class AppModule {}
