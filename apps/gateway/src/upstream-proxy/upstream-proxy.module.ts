import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { UpstreamProxyController } from "./upstream-proxy.controller.js";
import { UpstreamProxyService } from "./upstream-proxy.service.js";

@Module({
  imports: [CommonModule],
  controllers: [UpstreamProxyController],
  providers: [UpstreamProxyService],
})
export class UpstreamProxyModule {}
