export function runAsProbe<T>(fn: () => Promise<T>): Promise<T>;
export function isProbeContext(): boolean;
export function shouldIsolateProbeFailures(): Promise<boolean>;
