import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SessionLeasesController } from "./session-leases.controller.js";
import { SessionLeasesService } from "./session-leases.service.js";

@Module({
  imports: [CommonModule],
  controllers: [SessionLeasesController],
  providers: [SessionLeasesService],
})
export class SessionLeasesModule {}
