/** Transport primitives shared by the HTTP deployables. */
export {
  registerHttpInfrastructure,
  authzPlugin,
  csrfPlugin,
  LocalAuthBroker,
  type AuthzOptions,
  type EngineAuthAdapter,
  type LocalAuthBrokerOptions,
  type LocalBrokerSession,
} from "./app.js";
export {
  registerCompatDispatcher,
  dispatchWebRoute,
  matchCompatRoute,
  type CompatDispatcherOptions,
  type CompatRouteDefinition,
  type CompatRouteModule,
  type WebRouteHandler,
} from "./routes/compatDispatcher.js";
