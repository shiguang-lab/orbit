export interface WebSessionContractProvider {
  providerId: string;
  displayName: string;
  loginUrl: string;
  homeUrl: string;
  tokenSources: Array<Record<string, unknown>>;
  credential: {
    kind: "cookie" | "token";
    storageKeys: string[];
    acceptsFullCookieHeader: boolean;
  };
}

export interface WebSessionContract {
  version: 1;
  providers: WebSessionContractProvider[];
}

export function buildWebSessionContract(): WebSessionContract;
