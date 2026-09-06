export interface CopilotMessage { role: "user" | "assistant" | "system"; content: string; }
export interface CopilotRequest { messages: CopilotMessage[]; }
export interface CopilotResponse { message: string; toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: string }>; }
export function processCopilotChat(request: CopilotRequest): Promise<CopilotResponse>;
