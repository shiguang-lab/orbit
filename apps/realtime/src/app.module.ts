import { Module } from "@nestjs/common";
import { HttpModule } from "@orbit/http";
import { ProcessHealthModule } from "./modules/process-health/process-health.module.js";
import { LiveModule } from "./modules/live/live.module.js";
import { DatabaseRuntimeLifecycleService } from "./database-runtime-lifecycle.service.js";

@Module({
  imports: [HttpModule, ProcessHealthModule, LiveModule],
  providers: [DatabaseRuntimeLifecycleService],
})
export class AppModule {}
