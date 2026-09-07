import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ExplainRoutingController } from "./explain-routing.controller.js";
import { ExplainRoutingService } from "./explain-routing.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ExplainRoutingController],
  providers: [ExplainRoutingService],
})
export class ExplainRoutingModule {}
