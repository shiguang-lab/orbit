import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { IssuesController } from "./issues.controller.js";
import { IssuesService } from "./issues.service.js";

@Module({
  imports: [CommonModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
