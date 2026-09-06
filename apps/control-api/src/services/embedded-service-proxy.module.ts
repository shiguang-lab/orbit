import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { EmbeddedServiceProxyController } from "./embedded-service-proxy.controller.js";

@Module({ imports: [CommonModule], controllers: [EmbeddedServiceProxyController] })
export class EmbeddedServiceProxyModule {}
