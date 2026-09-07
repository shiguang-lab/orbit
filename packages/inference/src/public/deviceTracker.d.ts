export interface DeviceDetail { fingerprint: string; ip: string; userAgent: string; lastSeen: number; }
export function getDeviceCount(apiKeyId: string | null | undefined): number;
export function getDeviceDetails(apiKeyId: string | null | undefined): DeviceDetail[];
