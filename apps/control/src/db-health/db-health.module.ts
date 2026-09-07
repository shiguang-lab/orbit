import { Module } from "@nestjs/common";
import { DbHealthController } from "./db-health.controller.js";
import { DbHealthService } from "./db-health.service.js";

@Module({
  controllers: [DbHealthController],
  providers: [DbHealthService],
})
export class DbHealthModule {}
