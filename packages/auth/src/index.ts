export {
  authzPlugin,
  getCookieValueFromHeader,
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
  isLocalDevMode,
  DEV_ADMIN_IDENTITY,
  type ResolvedIdentity,
  type SessionOptions,
} from "./gateway-session.js";
export {
  SgIdentityVerifier,
  type ResolvedSgIdentity,
  type SgIdentityOptions,
} from "./sg-identity.verifier.js";
export {
  MANAGE_SCOPE,
  MCP_CONNECT_SCOPE,
  MANAGEMENT_API_KEY_SCOPES,
  hasManageScope,
  hasMcpConnectOrManageScope,
} from "./management-scopes.js";
export {
  extractApiKey,
  isValidGatewayApiKey,
  type ApiKeyRequestLike,
  type AuthRequestHeaders,
} from "./request-api-key.js";
