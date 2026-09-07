import { getCachedProviderNodes } from "@orbit/core/db/read-cache";
import { isFeatureFlagEnabled } from "@orbit/core/runtime/feature-flags";
import {
  buildDynamicAudioProvider,
  isLoopbackNodeHost,
  type AudioProvider,
  type ProviderNodeRow,
} from "../config/audioRegistry.ts";

export const AUDIO_REMOTE_NODES_FLAG = "AUDIO_REMOTE_PROVIDER_NODES";
export { isLoopbackNodeHost as isLocalAudioNodeHost };

export function selectAudioProviderNodes(
  nodes: ProviderNodeRow[],
  options: { audioPath: string; nodeApiType: string; allowRemote: boolean },
): AudioProvider[] {
  const eligible = nodes.filter((node) => {
    if (
      node.apiType !== options.nodeApiType &&
      node.apiType !== "chat" &&
      node.apiType !== "responses"
    ) return false;
    if (!node.baseUrl) return false;
    return isLoopbackNodeHost(node.baseUrl) || options.allowRemote;
  });

  const providers: AudioProvider[] = [];
  for (const node of eligible) {
    const provider = buildDynamicAudioProvider(node, options.audioPath);
    providers.push(provider);
    if (node.id && node.id !== node.prefix) providers.push({ ...provider, id: node.id });
  }
  return providers;
}

export async function resolveDynamicAudioProviders(
  audioPath: string,
  nodeApiType: string,
): Promise<AudioProvider[]> {
  try {
    const nodes = await getCachedProviderNodes();
    if (!Array.isArray(nodes)) return [];
    let allowRemote = false;
    try {
      allowRemote = isFeatureFlagEnabled(AUDIO_REMOTE_NODES_FLAG);
    } catch {
      allowRemote = false;
    }
    return selectAudioProviderNodes(nodes as unknown as ProviderNodeRow[], {
      audioPath,
      nodeApiType,
      allowRemote,
    });
  } catch {
    return [];
  }
}
