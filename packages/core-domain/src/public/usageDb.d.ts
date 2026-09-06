export function saveCallLog(entry: Record<string, unknown>): Promise<void>;
export function getRecentLogs(limit?: number): Promise<string[]>;
export function getCallLogs(filter?: Record<string, unknown>): Promise<any[]>;
export function getCallLogById(id: string): Promise<any | null>;
export function exportCallLogsSince(since: string): Promise<any[]>;
export function getPendingById(): Map<string, any>;
export function getCompletedDetails(): Map<string, any>;
