export type EnforceDecision =
  | { kind: "allow"; deprioritize?: boolean }
  | {
      kind: "block";
      reason: string;
      httpStatus: 429;
      retryAfterSeconds?: number;
    };
