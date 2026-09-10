export type TaskState = "submitted" | "working" | "completed" | "failed" | "cancelled";
export declare function getTaskManager(): any;
export interface A2ATaskHistoryRow { id:string;state:string;skill_id:string|null;input_json:string|null;output_json:string|null;api_key_id:string|null;created_at:string;updated_at:string;completed_at:string|null }
export declare function listA2ATaskHistory(filter:{from?:string;to?:string;skill?:string;state?:string;owner?:string;limit:number;offset:number}):{rows:A2ATaskHistoryRow[];total:number};
export declare function listA2ATaskEvents(taskId:string):Array<{event_type:string;data_json:string|null;created_at:string}>;
export declare function logRoutingDecision(decision: Record<string, unknown>): void;
export declare function createA2AStream(
  task: any,
  execute: (task: any) => Promise<any>,
  signal?: AbortSignal,
  lifecycle?: { onStart?: () => void; onEnd?: () => void },
): ReadableStream<Uint8Array>;
export declare const SSE_HEADERS: Record<string, string>;
export declare const A2A_SKILL_HANDLERS: Record<string, (task: any) => Promise<any>>;
export declare function executeA2ATaskWithState(manager: any, task: any, handler: (task: any) => Promise<any>): Promise<any>;
export declare function authenticateA2ARequest(request: Request): Promise<boolean>;
export declare function resolveA2AOwner(request: Request): string | undefined;
export declare function extractA2AApiKey(request: Request): string | null;
export declare function isValidA2AApiKey(apiKey: string): Promise<boolean>;
export declare function createConductorTask(input: Record<string, unknown>): Promise<any>;
export declare function getCachedSettings(): Promise<any>;
export declare function getSettings(): Promise<any>;
