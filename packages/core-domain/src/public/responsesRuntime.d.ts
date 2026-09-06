export function resolveResponsesApiModel(
  requestedModel: string,
  resolve: (model: string) => Promise<{ provider?: string; model?: string; [key: string]: unknown }>,
  isCombo?: (name: string) => Promise<boolean> | boolean,
): Promise<{ model: string; changed: boolean }>;
export const CHAT_ADMISSION_QUEUE_MAX_MS: number;
export function resolveSessionId(request: Request): string;
export function admitChatRequest(request: Request, options?: Record<string, unknown>): Promise<any>;
export function admitChatStructure(body: unknown, lease: any, options?: Record<string, unknown>): Promise<any>;
export function releaseChatAdmissionAfterHandler(response: Promise<Response>, lease: any): Promise<Response>;
export function releaseChatAdmissionWhenDone(response: Response, lease: any): Response;
