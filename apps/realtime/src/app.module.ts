import { Module } from "@nestjs/common";
import { HealthModule as ProcessHealthModule, HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { LiveModule } from "./modules/live/live.module.js";

@Module({
  imports: [HttpKernelModule, ProcessHealthModule, LiveModule],
})
export class AppModule {}
