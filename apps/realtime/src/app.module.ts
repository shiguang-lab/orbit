import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { ProcessHealthModule } from "./modules/process-health/process-health.module.js";
import { LiveModule } from "./modules/live/live.module.js";
import { DatabaseRuntimeLifecycleService } from "./database-runtime-lifecycle.service.js";

@Module({
  imports: [HttpKernelModule, ProcessHealthModule, LiveModule],
  providers: [DatabaseRuntimeLifecycleService],
})
export class AppModule {}
