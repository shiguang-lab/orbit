import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CursorCliController } from "./cursor-cli.controller.js";
import { CursorCliService } from "./cursor-cli.service.js";

@Module({
  imports: [CommonModule],
  controllers: [CursorCliController],
  providers: [CursorCliService],
})
export class CursorCliModule {}
