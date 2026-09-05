import { Global, Module } from "@nestjs/common";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CompatRoutesService } from "./compat-routes.service.js";
import { ControlRuntimeService } from "./control-runtime.service.js";
import { ControlSecurityService } from "./control-security.service.js";
import { ControlHttpInfrastructureService } from "./http-infrastructure.service.js";

@Global()
@Module({
  providers: [
    ControlHttpInfrastructureService,
    WebRouteDispatcher,
    ControlRuntimeService,
    ControlSecurityService,
    CompatRoutesService,
  ],
  exports: [
    ControlHttpInfrastructureService,
    WebRouteDispatcher,
    ControlRuntimeService,
    ControlSecurityService,
    CompatRoutesService,
  ],
})
export class InfrastructureModule {}
