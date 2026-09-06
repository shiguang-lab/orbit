export declare const EGRESS_ECHO_URL_DUAL: string;
export declare const EGRESS_ECHO_URL_V4: string;
export declare const EGRESS_ECHO_URL_ENV: string;
export declare const MIN_ECHO_ATTEMPT_MS: number;
export declare function resolveEgressEchoUrls(env?: Record<string, string | undefined>): string[];
export declare function splitEchoAttemptBudget(totalMs: number, attempts: number): number[];
export interface EchoAttemptOutcome<T> { result: T; url: string; }
export declare function probeEchoTargets<T>(run: (url: string, timeoutMs: number) => Promise<T>, totalMs: number, env?: Record<string, string | undefined>): Promise<EchoAttemptOutcome<T>>;
