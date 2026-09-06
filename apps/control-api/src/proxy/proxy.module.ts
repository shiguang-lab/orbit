import { Module } from "@nestjs/common";
import { ProxyController } from "./proxy.controller.js";
import { ProxyTestService } from "./proxy-test.service.js";

@Module({ controllers: [ProxyController], providers: [ProxyTestService] })
export class ProxyModule {}
