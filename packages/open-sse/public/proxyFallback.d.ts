export declare function getProxyCandidates(targetUrl?: string): Promise<string[]>;
export declare function testProxiesAgainstTarget(targetUrl: string, proxyUrls: string[]): Promise<Array<{ proxyUrl: string; ok: boolean; latencyMs: number | null }>>;
