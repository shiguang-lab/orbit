import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RegisteredKeysController } from "./registered-keys.controller.js";
import { RegisteredKeysService } from "./registered-keys.service.js";

@Module({ imports: [CommonModule], controllers: [RegisteredKeysController], providers: [RegisteredKeysService] })
export class RegisteredKeysModule {}
