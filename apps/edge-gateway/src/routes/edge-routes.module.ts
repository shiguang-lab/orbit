import { Module } from "@nestjs/common";
import { CompatRoutesService } from "./compat/compat-routes.service.js";

@Module({
  providers: [CompatRoutesService],
})
export class EdgeRoutesModule {}
