import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface SettingsEngine {
  getSettings(): Promise<Record<string, unknown>>;
  getComboDefaults?(): Promise<{ comboDefaults?: Record<string, unknown>; providerOverrides?: Record<string, unknown> }>;
  getCompressionSettings?(): Promise<Record<string, unknown>>;
}

export interface SidebarSettingsResponse {
  hiddenSidebarItems: string[];
  sidebarSectionOrder: string[];
  sidebarItemOrder: Record<string, string[]>;
  sidebarActivePreset?: string;
  blockedProviders: string[];
  codexServiceTier?: unknown;
  showQuickStartOnHome?: boolean;
  showProviderTopologyOnHome?: boolean;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, items]) => [key, stringList(items)]),
  );
}

/** Read-only dashboard customization projection; never expose secrets/settings wholesale. */
export async function settingsRoutes(
  app: FastifyInstance,
  opts: { engine?: SettingsEngine } = {},
): Promise<void> {
  app.get("/settings/require-login", async (_request, reply) => {
    try {
      const settings = opts.engine ? await opts.engine.getSettings() : {};
      return reply.status(200).send({
        authenticated: false,
        requireLogin: settings.requireLogin !== false,
        hasPassword: typeof settings.password === "string" && settings.password.length > 0,
        setupComplete: settings.setupComplete === true,
        oidcEnabled: settings.oidcEnabled === true,
        oidcDisablePasswordLogin: settings.oidcDisablePasswordLogin === true,
      });
    } catch {
      return reply.status(200).send({ authenticated: false, requireLogin: true, hasPassword: true, setupComplete: true, oidcEnabled: false, oidcDisablePasswordLogin: false });
    }
  });

  const sidebarSettings = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = opts.engine ? await opts.engine.getSettings() : {};
      const response: SidebarSettingsResponse = {
        hiddenSidebarItems: stringList(settings.hiddenSidebarItems),
        sidebarSectionOrder: stringList(settings.sidebarSectionOrder),
        sidebarItemOrder: stringMap(settings.sidebarItemOrder),
        blockedProviders: stringList(settings.blockedProviders),
      };
      if (typeof settings.sidebarActivePreset === "string") {
        response.sidebarActivePreset = settings.sidebarActivePreset;
      }
      if (settings.codexServiceTier !== undefined || settings.codexFastServiceTier !== undefined) {
        response.codexServiceTier = settings.codexServiceTier ?? settings.codexFastServiceTier;
      }
      if (typeof settings.showQuickStartOnHome === "boolean") response.showQuickStartOnHome = settings.showQuickStartOnHome;
      if (typeof settings.showProviderTopologyOnHome === "boolean") response.showProviderTopologyOnHome = settings.showProviderTopologyOnHome;
      return reply.status(200).send(response);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch sidebar settings" });
    }
  };
  // Keep the online Orbit contract (/api/settings) while providing the
  // narrower migration endpoint used by the admin shell.
  app.get("/settings", sidebarSettings);
  app.get("/settings/sidebar", sidebarSettings);

  app.get("/settings/combo-defaults", async (_request, reply) => {
    try {
      if (opts.engine?.getComboDefaults) {
        const defaults = await opts.engine.getComboDefaults();
        return reply.status(200).send(defaults);
      }
      return reply.status(200).send({
        comboDefaults: {
          strategy: "priority",
          maxRetries: 1,
          retryDelayMs: 2000,
          fallbackDelayMs: 0,
          handoffThreshold: 0.85,
          handoffModel: "",
          maxMessagesForSummary: 30,
          maxComboDepth: 3,
          trackMetrics: true,
          reasoningTokenBufferEnabled: true,
          zeroLatencyOptimizationsEnabled: false,
        },
        providerOverrides: {},
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combo defaults" });
    }
  });

  app.get("/settings/compression", async (_request, reply) => {
    try {
      if (opts.engine?.getCompressionSettings) {
        const compression = await opts.engine.getCompressionSettings();
        return reply.status(200).send(compression);
      }
      return reply.status(200).send({ enabled: false });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch compression settings" });
    }
  });
}
