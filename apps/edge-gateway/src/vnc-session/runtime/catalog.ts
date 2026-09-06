import { listVncProviders } from "./manifest.js";
import { listSessions } from "./service.js";

/**
 * GET /api/vnc-session
 *
 * List active VNC login sessions and the catalog of providers that support
 * interactive browser login. Management-scoped (same auth as other admin
 * endpoints); no secrets are returned — only session metadata + ports.
 */
export function getVncSessionCatalog() {
  return {
    sessions: listSessions().map(({ containerName, profileDir, ...rest }) => rest),
    providers: listVncProviders().map((provider) => ({
      id: provider.id,
      name: provider.name,
      url: provider.url,
      kind: provider.requirement.kind,
    })),
  };
}
