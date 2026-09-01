import type { FastifyInstance } from "fastify";

export interface ProviderNodeEngine {
  listProviderNodes(limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
  countProviderNodes(): number;
  isCcCompatibleProviderEnabled(): boolean;
}

/** Read-only provider-node projection used by the Providers dashboard. */
export async function providerNodeRoutes(
  app: FastifyInstance,
  opts: { engine?: ProviderNodeEngine } = {},
): Promise<void> {
  app.get("/provider-nodes", async (request, reply) => {
    try {
      if (!opts.engine) {
        return reply.status(200).send({ nodes: [], total: 0, ccCompatibleProviderEnabled: false });
      }

      const url = new URL(request.url, "http://bff");
      const limitValue = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
      const offsetValue = Number.parseInt(url.searchParams.get("offset") ?? "", 10);
      const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : undefined;
      const offset = Number.isInteger(offsetValue) && offsetValue > 0 ? offsetValue : 0;
      const nodes = await opts.engine.listProviderNodes(limit, offset);

      // Provider nodes may contain custom headers and credentials. The list page
      // only needs identity/display fields, so never expose the raw row here.
      const safeNodes = nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        apiType: node.apiType,
        iconUrl: node.iconUrl,
        baseUrl: node.baseUrl,
        chatPath: node.chatPath,
        modelsPath: node.modelsPath,
        prefix: node.prefix,
      }));
      return reply.status(200).send({
        nodes: safeNodes,
        total: opts.engine.countProviderNodes(),
        ccCompatibleProviderEnabled: opts.engine.isCcCompatibleProviderEnabled(),
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch provider nodes" });
    }
  });
}
