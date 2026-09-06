export type VncOperationResult =
  | { value: unknown; error?: never }
  | { error: { status: number; message: string }; value?: never };
export function getVncSession(connectionId: string, sessionId?: string): Promise<VncOperationResult>;
export function postVncSession(connectionId: string, sessionId?: string, action?: string): Promise<VncOperationResult>;
export function deleteVncSession(connectionId?: string, sessionId?: string): Promise<VncOperationResult>;
