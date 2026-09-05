import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProvidersController } from "./providers.controller.js";
import { ProvidersService } from "./providers.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
