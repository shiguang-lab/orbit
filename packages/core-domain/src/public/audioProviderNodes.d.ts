export interface ProviderNodeRow {
  id?: string;
  prefix: string;
  name: string;
  baseUrl: string;
  apiType?: string;
}

export interface AudioProvider {
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
}

export declare const AUDIO_REMOTE_NODES_FLAG: string;
export declare function isLocalAudioNodeHost(baseUrl: string): boolean;
export declare function selectAudioProviderNodes(
  nodes: ProviderNodeRow[],
  options: { audioPath: string; nodeApiType: string; allowRemote: boolean }
): AudioProvider[];
export declare function resolveDynamicAudioProviders(
  audioPath: string,
  nodeApiType: string
): Promise<AudioProvider[]>;
