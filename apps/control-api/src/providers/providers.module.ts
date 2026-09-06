import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProvidersController } from "./providers.controller.js";
import { ProvidersService } from "./providers.service.js";
import { ProviderPolicyService } from "./provider-policy.service.js";
import { ProviderClientService } from "./provider-client.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderPolicyService, ProviderClientService],
})
export class ProvidersModule {}
