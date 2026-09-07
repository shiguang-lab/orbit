export function executeImageCombo(
  comboName: string,
  body: Record<string, unknown>,
  auth: {
    request: Request;
    policy: { apiKeyInfo?: { id?: string; name?: string } | null };
  },
  startTime: number,
  log: any,
): Promise<Response>;
