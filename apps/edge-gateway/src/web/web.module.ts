import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { WebFetchController } from "./web-fetch.controller.js";
import { WebFetchService } from "./web-fetch.service.js";

@Module({
  imports: [CommonModule],
  controllers: [WebFetchController],
  providers: [WebFetchService],
})
export class WebModule {}
