import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MiddlewareHooksController } from "./middleware-hooks.controller.js";
import { MiddlewareHooksRepository } from "./middleware-hooks.repository.js";
import { MiddlewareHooksService } from "./middleware-hooks.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MiddlewareHooksController],
  providers: [MiddlewareHooksRepository, MiddlewareHooksService],
})
export class MiddlewareHooksModule {}
