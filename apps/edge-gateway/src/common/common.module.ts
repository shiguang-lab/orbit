import { Module } from "@nestjs/common";
import { WebRouteDispatcher } from "./web-route.dispatcher.js";

/** Shared transport helpers used by edge feature modules. */
@Module({
  providers: [WebRouteDispatcher],
  exports: [WebRouteDispatcher],
})
export class CommonModule {}
