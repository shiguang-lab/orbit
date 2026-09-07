/**
 * Provider-node selection for the audio feature.
 *
 * This is app-owned policy: the edge gateway decides which configured nodes may
 * serve its audio routes.  The shared packages only provide the provider
 * registry and the database read contract.
 */

type ProviderNodeRow = {
  id?: string;
  prefix?: string;
  apiType?: string;
  baseUrl?: string;
  [key: string]: unknown;
};

export type AudioProvider = {
  id: string;
  credentialProviderId?: string;
  baseUrl: string;
  authType: string;
  authHeader: string;
  format?: string;
  supportedFormats?: string[];
  async?: boolean;
  models: Array<{ id: string; name: string }>;
  [key: string]: unknown;
};

type DynamicRegistry = {
  buildDynamicAudioProvider(node: ProviderNodeRow, audioPath: string): AudioProvider;
  isLoopbackNodeHost(baseUrl: string): boolean;
};

const load = (specifier: string): Promise<any> => import(specifier as string);

export const AUDIO_REMOTE_NODES_FLAG = "AUDIO_REMOTE_PROVIDER_NODES";

export function selectAudioProviderNodes(
  nodes: ProviderNodeRow[],
  options: { audioPath: string; nodeApiType: string; allowRemote: boolean },
  registry: DynamicRegistry,
): AudioProvider[] {
  const eligible = nodes.filter((node) => {
    if (
      node.apiType !== options.nodeApiType &&
      node.apiType !== "chat" &&
      node.apiType !== "responses"
    ) {
      return false;
    }
    if (!node.baseUrl || !node.prefix) return false;
    return registry.isLoopbackNodeHost(node.baseUrl) || options.allowRemote;
  });

  const providers: AudioProvider[] = [];
  for (const node of eligible) {
    const provider = registry.buildDynamicAudioProvider(node, options.audioPath);
    providers.push(provider);
    if (node.id && node.id !== node.prefix) providers.push({ ...provider, id: node.id });
  }
  return providers;
}

/** Resolve configured provider nodes without making a database failure fatal. */
export async function resolveDynamicAudioProviders(
  audioPath: string,
  nodeApiType: string,
): Promise<AudioProvider[]> {
  try {
    const [{ getCachedProviderNodes }, { isFeatureFlagEnabled }, registry] = await Promise.all([
      load("@orbit/core/db/read-cache"),
      load("@orbit/core/runtime/feature-flags"),
      load("@orbit/inference/config/audioRegistry"),
    ]);
    const nodes = await getCachedProviderNodes();
    if (!Array.isArray(nodes)) return [];
    let allowRemote = false;
    try {
      allowRemote = Boolean(isFeatureFlagEnabled(AUDIO_REMOTE_NODES_FLAG));
    } catch {
      allowRemote = false;
    }
    return selectAudioProviderNodes(nodes as ProviderNodeRow[], {
      audioPath,
      nodeApiType,
      allowRemote,
    }, registry as DynamicRegistry);
  } catch {
    return [];
  }
}

