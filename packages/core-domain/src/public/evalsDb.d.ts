export interface EvalCaseRecord {
  id: string;
  suiteId: string;
  name: string;
  model?: string;
  input: {
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  };
  expected: {
    strategy: string;
    value?: string;
  };
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvalSuiteRecord {
  id: string;
  name: string;
  description?: string;
  source: "custom";
  caseCount: number;
  cases: EvalCaseRecord[];
  createdAt: string;
  updatedAt: string;
}

export function listEvalRuns(options?: { limit?: number; offset?: number }): any[];
export function getEvalScorecard(options?: { limit?: number }): any;
export function saveCustomEvalSuite(input: any): EvalSuiteRecord;
export function getCustomEvalSuite(id: string): EvalSuiteRecord | null;
export function deleteCustomEvalSuite(id: string): boolean;
