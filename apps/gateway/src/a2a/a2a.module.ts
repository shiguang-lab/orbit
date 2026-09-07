import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { A2aController } from "./a2a.controller.js";
import { A2aRootController } from "./a2a-root.controller.js";
import { A2aStatusController } from "./a2a-status.controller.js";
import { A2aTaskCancelController } from "./a2a-task-cancel.controller.js";
import { A2aTaskController } from "./a2a-task.controller.js";
import { A2aTasksController } from "./a2a-tasks.controller.js";
import { A2aService } from "./a2a.service.js";

@Module({
  imports: [CommonModule],
  controllers: [
    A2aController,
    A2aRootController,
    A2aTasksController,
    A2aTaskController,
    A2aTaskCancelController,
    A2aStatusController,
  ],
  providers: [A2aService],
})
export class A2aModule {}
