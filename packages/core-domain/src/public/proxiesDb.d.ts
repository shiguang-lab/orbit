export function resolveProxyForProvider(providerId: string): Promise<unknown | null>;
export function hasBlockingProxyAssignmentForProvider(providerId: string): boolean;
export function hasBlockingProxyAssignment(connectionId: string, providerId?: string): boolean;
