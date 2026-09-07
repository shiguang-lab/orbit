import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { SearchProvidersController } from "./search-providers.controller.js";
import { SearchProvidersService } from "./search-providers.service.js";

@Module({
  imports: [CommonModule],
  controllers: [SearchProvidersController],
  providers: [SearchProvidersService],
})
export class SearchProvidersModule {}
