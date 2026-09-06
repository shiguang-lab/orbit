export interface FaroAnswer {
  ok: boolean;
  text: string;
  pending: unknown;
}
export interface FaroProxyOptions {
  fetchImpl?: typeof fetch;
}
export declare function askFaro(message: string, opts?: FaroProxyOptions): Promise<FaroAnswer>;
