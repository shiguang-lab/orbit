import { Injectable } from "@nestjs/common";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { buildWebSessionContract } from "@orbit/inference/services/web-session-contract";

/** Provider metadata surfaces consumed by dashboard/client integrations. */
@Injectable()
export class ProviderClientService {
  async listConnections() {
    const connections = await getProviderConnections();
    return {
      // This endpoint is an internal same-origin sync surface. Preserve the
      // existing contract and include the sensitive connection fields.
      connections: connections.map((connection) => ({ ...connection })),
    };
  }

  getWebSessionContract() {
    return buildWebSessionContract();
  }
}
