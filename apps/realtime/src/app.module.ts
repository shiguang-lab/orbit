import { Module } from "@nestjs/common";
import "@shiguang-gateway/open-sse/services/dbRuntimeHooks";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { ProcessHealthModule } from "./modules/process-health/process-health.module.js";
import { LiveModule } from "./modules/live/live.module.js";

@Module({
  imports: [HttpKernelModule, ProcessHealthModule, LiveModule],
})
export class AppModule {}
