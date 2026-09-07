import { Module } from "@nestjs/common";
import { ReasoningRoutingController } from "./reasoning-routing.controller.js";
import { ReasoningRoutingService } from "./reasoning-routing.service.js";

/** Control-plane module for operator-managed reasoning routing policies. */
@Module({
  controllers: [ReasoningRoutingController],
  providers: [ReasoningRoutingService],
})
export class ReasoningRoutingModule {}
