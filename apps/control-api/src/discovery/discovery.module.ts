import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { DiscoveryController } from "./discovery.controller.js";
import { DiscoveryService } from "./discovery.service.js";

@Module({
  imports: [CommonModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}

