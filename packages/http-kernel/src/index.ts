/** Nest transport module shared by the HTTP deployables. */
export { HttpKernelModule } from "./http-kernel.module.js";
export { HttpHealthController } from "./health/http-health.controller.js";
export { ApiExceptionFilter } from "./filters/api-exception.filter.js";
export { RequestIdInterceptor } from "./interceptors/request-id.interceptor.js";
export { RequestIdMiddleware } from "./middleware/request-id.middleware.js";
// Temporary app-auth adapters remain exported for control-api's explicit
// security integration. They are not part of HttpKernelModule's transport
// surface and should move to a dedicated auth package in the next migration.
export {
  authzPlugin,
  type AuthzOptions,
  type EngineAuthAdapter,
} from "./middleware/authz.js";
export { csrfPlugin } from "./middleware/csrf.js";
export {
  LocalAuthBroker,
  type LocalAuthBrokerOptions,
  type LocalBrokerSession,
} from "./lib/broker.js";
export {
  registerCompatDispatcher,
  dispatchWebRoute,
  matchCompatRoute,
  type CompatDispatcherOptions,
  type CompatRouteDefinition,
  type CompatRouteModule,
  type WebRouteHandler,
} from "./routes/compatDispatcher.js";
