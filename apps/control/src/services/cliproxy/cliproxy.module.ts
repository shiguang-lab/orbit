import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { CliproxyController } from "./cliproxy.controller.js";
import { CliproxyService } from "./cliproxy.service.js";

@Module({ imports: [CommonModule], controllers: [CliproxyController], providers: [CliproxyService] })
export class CliproxyModule {}
