/** HTTP response status codes shared across transport and domain boundaries. */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ACCEPTABLE: 406,
  UNPROCESSABLE_ENTITY: 422,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  RATE_LIMITED: 429,
  /** Upstream "plan limit reached" — used by search/plan-metered upstreams (e.g. Tavily, Context7). */
  PLAN_LIMIT_EXCEEDED: 432,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};
