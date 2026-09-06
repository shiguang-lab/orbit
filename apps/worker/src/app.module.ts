import { Module } from "@nestjs/common";
import "@shiguang-gateway/open-sse/services/dbRuntimeHooks";
import { WorkerJobsService } from "./jobs/worker-jobs.service.js";

/** Root module for the worker's standalone Nest application context. */
@Module({
  providers: [WorkerJobsService],
})
export class AppModule {}
