import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CloudAgentsController } from "./cloud-agents.controller.js";
import { CloudAgentsService } from "./cloud-agents.service.js";
import { CloudAgentsCredentialsController } from "./cloud-agents-credentials.controller.js";
import { CloudAgentsTasksController } from "./cloud-agents-tasks.controller.js";
import { CloudAgentsTaskController } from "./cloud-agents-task.controller.js";

@Module({
  imports: [CommonModule],
  controllers: [CloudAgentsController, CloudAgentsCredentialsController, CloudAgentsTasksController, CloudAgentsTaskController],
  providers: [CloudAgentsService],
})
export class CloudAgentsModule {}
