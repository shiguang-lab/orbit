import { Module } from "@nestjs/common";
import { LiveServerService } from "./live-server.service.js";

@Module({
  providers: [LiveServerService],
})
export class LiveModule {}
