export type ProviderNode = Record<string, unknown> & {
  id: string;
  type?: string | null;
  name?: string | null;
  prefix?: string | null;
  apiType?: string | null;
  baseUrl?: string | null;
  chatPath?: string | null;
  modelsPath?: string | null;
  iconUrl?: string | null;
};

export function getProviderNodes(
  filter?: Record<string, unknown>,
  limit?: number,
  offset?: number,
): Promise<ProviderNode[]>;
export function getProviderNodesCount(filter?: Record<string, unknown>): number;
export function createProviderNode(data: Record<string, unknown>): Promise<ProviderNode>;
