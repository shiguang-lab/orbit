import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { IssueAgentController } from "./issue-agent.controller.js";
import { IssueAgentService } from "./issue-agent.service.js";
@Module({ imports: [CommonModule], controllers: [IssueAgentController], providers: [IssueAgentService] })
export class IssueAgentModule {}
