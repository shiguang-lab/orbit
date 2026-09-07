export type ProviderPrefixStatus = 'unique' | 'ambiguous' | 'reserved';

export interface ProviderPrefixEntry {
  prefix: string;
  status: ProviderPrefixStatus;
  nodeId?: string;
}

export interface ProviderPrefixIndex {
  entries: Map<string, ProviderPrefixEntry>;
  nodeToPrefix: Map<string, string>;
  prefixToNode: Map<string, string>;
  compatibleNodeIds: Set<string>;
  eligibleNodeIds: Set<string>;
}

export function getProviderPrefixIndex(): Promise<ProviderPrefixIndex>;
