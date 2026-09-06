import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { NetworkInfoController } from "./network-info.controller.js";
import { NetworkInfoService } from "./network-info.service.js";

@Module({
  imports: [CommonModule],
  controllers: [NetworkInfoController],
  providers: [NetworkInfoService],
})
export class NetworkModule {}
