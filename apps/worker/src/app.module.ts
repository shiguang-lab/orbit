import { Module } from "@nestjs/common";
import { RealtimePublisherLifecycleService } from "./realtime-publisher-lifecycle.service.js";
import { WorkerJobsService } from "./jobs/worker-jobs.service.js";
import { DatabaseRuntimeLifecycleService } from "./database-runtime-lifecycle.service.js";

/** Root module for the worker's standalone Nest application context. */
@Module({
  providers: [WorkerJobsService, DatabaseRuntimeLifecycleService, RealtimePublisherLifecycleService],
})
export class AppModule {}
