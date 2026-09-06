export type ControlResult = { status: number; body: unknown };
export declare function getCodexDeviceTicket(token: string): ControlResult;
export declare function completeCodexDeviceFlow(token: string, rawBody: unknown): Promise<ControlResult>;
export declare function issueDahlTokens(): Promise<ControlResult>;
export declare function initializeControlRuntime(): Promise<ControlResult>;
