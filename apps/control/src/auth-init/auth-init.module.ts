import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AuthInitController } from "./auth-init.controller.js";

@Module({ imports: [CommonModule], controllers: [AuthInitController] })
export class AuthInitModule {}
