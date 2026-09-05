export {
  authzPlugin,
  getCookieValueFromHeader,
  hasManageScope,
  MANAGE_SCOPE,
  MANAGEMENT_API_KEY_SCOPES,
  type AuthzOptions,
  type EngineAuthAdapter,
} from "./fastify/authz.plugin.js";
export {
  csrfPlugin,
  DASHBOARD_CSRF_HEADER,
  issueDashboardCsrfToken,
  validateDashboardCsrfToken,
  type DashboardCsrfToken,
} from "./fastify/csrf.plugin.js";
export {
  LocalAuthBroker,
  type LocalAuthBrokerOptions,
  type LocalBrokerSession,
} from "./local-auth-broker.js";
export {
  handleSession,
  isAdminIdentity,
  resolveGatewayIdentity,
  type ResolvedIdentity,
  type SessionOptions,
} from "./gateway-session.js";
export {
  SgIdentityVerifier,
  type ResolvedSgIdentity,
  type SgIdentityOptions,
} from "./sg-identity.verifier.js";
