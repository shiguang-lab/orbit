import { Module } from "@nestjs/common";
import { ProviderAuthImportController } from "./provider-auth-import.controller.js";
import { ProviderAuthImportService } from "./provider-auth-import.service.js";

@Module({
  controllers: [ProviderAuthImportController],
  providers: [ProviderAuthImportService],
})
export class ProviderAuthImportModule {}
