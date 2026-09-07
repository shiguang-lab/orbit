import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProxySubscriptionsController } from "./proxy-subscriptions.controller.js";
import { ProxySubscriptionsService } from "./proxy-subscriptions.service.js";

/** Control-plane management for operator proxy subscriptions. */
@Module({
  imports: [CommonModule],
  controllers: [ProxySubscriptionsController],
  providers: [ProxySubscriptionsService],
})
export class ProxySubscriptionsModule {}
