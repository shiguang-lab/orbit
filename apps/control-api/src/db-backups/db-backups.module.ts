import { Module } from "@nestjs/common";
import { DbBackupsController } from "./db-backups.controller.js";
import { DbBackupsService } from "./db-backups.service.js";

@Module({
  controllers: [DbBackupsController],
  providers: [DbBackupsService],
  exports: [DbBackupsService],
})
export class DbBackupsModule {}
