import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { ZedImportController } from "./zed-import.controller.js";
import { ZedImportService } from "./zed-import.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ZedImportController],
  providers: [ZedImportService],
})
export class ZedImportModule {}
