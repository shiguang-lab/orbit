import { Global, Module } from "@nestjs/common";
import { HttpInfrastructureService } from "./http-infrastructure.service.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

@Global()
@Module({
  providers: [HttpInfrastructureService, WebRouteDispatcher],
  exports: [HttpInfrastructureService, WebRouteDispatcher],
})
export class HttpInfrastructureModule {}
