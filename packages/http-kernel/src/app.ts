/**
 * Transport-only Fastify foundation shared by the deployable apps.
 *
 * This module deliberately has no route catalog, runtime bootstrap, database
 * adapter, or app-surface flag. Edge and control compose their own domain
 * startup and route registration above this foundation.
 */
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerErrorHandler } from "./plugins/error.js";
import { requestIdPlugin } from "./middleware/requestId.js";

/** Register transport concerns common to every HTTP deployable. */
export async function registerHttpInfrastructure(app: FastifyInstance): Promise<FastifyInstance> {
  // Preserve multipart bodies as raw bytes. Domain-owned handlers can then
  // consume the standard Web Request.formData() API without transport policy
  // leaking into the route catalog.
  app.addContentTypeParser("multipart/form-data", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

  await app.register(cors as any, {
    origin: (_origin: unknown, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
    credentials: true,
  });

  await app.register(requestIdPlugin);

  // Cheap process probes; they must not depend on any domain or upstream
  // service and are therefore safe to share across deployables.
  app.get("/livez", async () => ({ status: "ok" }));
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ok" }));

  registerErrorHandler(app);
  return app;
}

export { authzPlugin, type AuthzOptions, type EngineAuthAdapter } from "./middleware/authz.js";
export { csrfPlugin } from "./middleware/csrf.js";
export { LocalAuthBroker, type LocalAuthBrokerOptions, type LocalBrokerSession } from "./lib/broker.js";
