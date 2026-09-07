import { Module } from "@nestjs/common";
import { TaskRoutingController } from "./task-routing.controller.js";
import { TaskRoutingService } from "./task-routing.service.js";

/** Control-plane module for operator-managed task-aware routing configuration. */
@Module({
  controllers: [TaskRoutingController],
  providers: [TaskRoutingService],
})
export class TaskRoutingModule {}
