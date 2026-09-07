export function createInjectionGuard(options?: Record<string, unknown>): (body: unknown) => {
  blocked: boolean;
  result: { flagged?: boolean; detections: unknown[]; [key: string]: unknown };
};
export function withInjectionGuard(handler: any, options?: Record<string, unknown>): any;
