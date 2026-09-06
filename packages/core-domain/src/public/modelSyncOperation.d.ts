export type AutoSyncConnection = {
  id: string;
  provider: string;
  name?: string;
};

export declare function syncConnectionModels(
  connectionId: string,
  provider: string,
  baseUrl?: string,
): Promise<boolean>;
export declare function runModelSyncCycle(apiBaseUrl?: string): Promise<void>;
export declare function getLastModelSyncTime(): Promise<string | null>;
export declare function revalidateCodexCatalogsOnStartup(options?: {
  apiBaseUrl?: string;
}): Promise<void>;
