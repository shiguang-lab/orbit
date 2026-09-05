import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { KeysController } from "./keys.controller.js";
import { KeysService } from "./keys.service.js";

@Module({
  imports: [CommonModule],
  controllers: [KeysController],
  providers: [KeysService],
})
export class KeysModule {}
