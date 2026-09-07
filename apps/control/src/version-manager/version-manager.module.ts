import { Module } from "@nestjs/common";
import { VersionManagerController } from "./version-manager.controller.js";
import { VersionManagerService } from "./version-manager.service.js";

@Module({
  controllers: [VersionManagerController],
  providers: [VersionManagerService],
})
export class VersionManagerModule {}
