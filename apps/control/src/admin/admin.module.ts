import { Module } from "@nestjs/common";
import { AdminConcurrencyController } from "./admin-concurrency.controller.js";
import { AdminConcurrencyService } from "./admin-concurrency.service.js";

@Module({ controllers: [AdminConcurrencyController], providers: [AdminConcurrencyService] })
export class AdminModule {}
