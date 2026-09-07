export type ControlResult = { status: number; body: unknown };
export declare function issueDahlTokens(): Promise<ControlResult>;
export declare function initializeControlRuntime(): Promise<ControlResult>;
