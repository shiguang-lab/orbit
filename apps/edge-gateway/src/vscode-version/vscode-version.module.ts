import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeVersionController } from "./vscode-version.controller.js";
import { VscodeVersionService } from "./vscode-version.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VscodeVersionController],
  providers: [VscodeVersionService],
})
export class VscodeVersionModule {}
