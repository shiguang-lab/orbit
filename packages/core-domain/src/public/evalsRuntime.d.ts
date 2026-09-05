export function buildEvalTargetOptions(): Promise<any[]>;
export function runEvalSuiteAgainstTarget(params: {
  suiteId: string;
  target: any;
  apiKeyId?: string | null;
  runGroupId?: string | null;
}): Promise<any>;
