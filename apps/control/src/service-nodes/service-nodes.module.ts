import { Module } from "@nestjs/common";
import { ServiceNodesController } from "./service-nodes.controller.js";
import { NodeReportsController } from "./node-reports.controller.js";
import { ServiceNodesService } from "./service-nodes.service.js";
@Module({
  controllers: [ServiceNodesController, NodeReportsController],
  providers: [ServiceNodesService],
})
export class ServiceNodesModule {}
