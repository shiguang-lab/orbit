import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

export interface EvalCase {
  id: string;
  name: string;
  model?: string;
  input?: {
    messages?: Array<{ role: string; content: string }>;
  };
  expected?: {
    strategy?: string;
    value?: string;
  };
  tags?: string[];
}

export interface EvalSuite {
  id: string;
  name: string;
  description?: string;
  source?: "built-in" | "custom";
  caseCount?: number;
  cases?: EvalCase[];
  updatedAt?: string;
}

export interface EvalResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: {
    expected?: string;
    actual?: string;
    actualSnippet?: string;
    searchTerm?: string;
    pattern?: string;
  };
}

export interface EvalRunSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface EvalRun {
  id: string;
  runGroupId: string | null;
  suiteId: string;
  suiteName: string;
  target: {
    type: "suite-default" | "model" | "combo";
    id: string | null;
    key: string;
    label: string;
  };
  avgLatencyMs: number;
  summary: EvalRunSummary;
  results: EvalResult[];
  outputs: Record<string, string>;
  createdAt: string;
}

export interface EvalScorecard {
  suites: number;
  totalCases: number;
  totalPassed: number;
  overallPassRate: number;
  perSuite: Array<{ id: string; name: string; passRate: number }>;
}

const builtInSuites: EvalSuite[] = [
  {
    id: "golden-set",
    name: "OmniRoute Golden Set",
    description: "多模型输出质量的基础评估基准测试集",
    source: "built-in",
    caseCount: 10,
    cases: [
      {
        id: "gs-01",
        name: "基础问候与响应",
        model: "gpt-4o",
        input: { messages: [{ role: "user", content: "Hello" }] },
        expected: { strategy: "contains", value: "hello" },
      },
      {
        id: "gs-02",
        name: "基础数学加法",
        model: "claude-sonnet-4-20250514",
        input: { messages: [{ role: "user", content: "What is 2+2?" }] },
        expected: { strategy: "contains", value: "4" },
      },
      {
        id: "gs-03",
        name: "地理常识问答",
        model: "gemini-2.5-flash",
        input: { messages: [{ role: "user", content: "What is the capital of France?" }] },
        expected: { strategy: "contains", value: "Paris" },
      },
      {
        id: "gs-04",
        name: "JSON 格式严谨性",
        model: "gpt-4o",
        input: {
          messages: [{ role: "user", content: "Return a JSON object with key 'status' and value 'ok'" }],
        },
        expected: { strategy: "regex", value: '"status"\\s*:\\s*"ok"' },
      },
      {
        id: "gs-05",
        name: "Python 代码生成",
        model: "claude-sonnet-4-20250514",
        input: { messages: [{ role: "user", content: "Write a hello world function in Python" }] },
        expected: { strategy: "contains", value: "def " },
      },
    ],
  },
  {
    id: "coding-proficiency",
    name: "编码能力评测 (Coding Proficiency)",
    description: "涵盖 Python, JavaScript, SQL 等语言的代码生成与 Debug 测试",
    source: "built-in",
    caseCount: 5,
    cases: [
      {
        id: "code-01",
        name: "Python — FizzBuzz 实现",
        model: "claude-sonnet-4-20250514",
        input: {
          messages: [{ role: "user", content: "Write a FizzBuzz function in Python for numbers 1 to 15" }],
        },
        expected: { strategy: "contains", value: "def " },
      },
      {
        id: "code-02",
        name: "JavaScript — 数组过滤",
        model: "gpt-4o",
        input: {
          messages: [{ role: "user", content: "Write a JavaScript function that filters even numbers from an array" }],
        },
        expected: { strategy: "regex", value: "filter|function" },
      },
      {
        id: "code-03",
        name: "SQL — SELECT 条件查询",
        model: "gemini-2.5-flash",
        input: {
          messages: [{ role: "user", content: "Write a SQL query to find users older than 25, ordered by name" }],
        },
        expected: { strategy: "regex", value: "SELECT.*FROM.*WHERE" },
      },
    ],
  },
  {
    id: "reasoning-logic",
    name: "逻辑与深度推理 (Reasoning & Logic)",
    description: "包含三段论演绎推理、数学应用题与规律推导",
    source: "built-in",
    caseCount: 5,
    cases: [
      {
        id: "reason-01",
        name: "逻辑三段论判断",
        model: "claude-sonnet-4-20250514",
        input: {
          messages: [
            {
              role: "user",
              content: "All cats are animals. Some animals are pets. Can we conclude all cats are pets? Answer yes or no.",
            },
          ],
        },
        expected: { strategy: "regex", value: "[Nn]o" },
      },
      {
        id: "reason-02",
        name: "路程速度应用题",
        model: "gpt-4o",
        input: {
          messages: [{ role: "user", content: "A train travels at 60 km/h for 2.5 hours. How far does it travel?" }],
        },
        expected: { strategy: "contains", value: "150" },
      },
      {
        id: "reason-03",
        name: "数列规律推导",
        model: "gemini-2.5-flash",
        input: {
          messages: [{ role: "user", content: "What comes next in the sequence: 2, 4, 8, 16, ?" }],
        },
        expected: { strategy: "contains", value: "32" },
      },
    ],
  },
];

let customSuites: EvalSuite[] = [];
let recentRuns: EvalRun[] = [
  {
    id: "run-init-01",
    runGroupId: null,
    suiteId: "golden-set",
    suiteName: "OmniRoute Golden Set",
    target: {
      type: "suite-default",
      id: null,
      key: "suite-default:__default__",
      label: "套件默认目标模型",
    },
    avgLatencyMs: 320,
    summary: {
      total: 5,
      passed: 5,
      failed: 0,
      passRate: 100,
    },
    results: [
      { caseId: "gs-01", caseName: "基础问候与响应", passed: true, durationMs: 180, details: { expected: "hello", actualSnippet: "Hello! How can I help you today?" } },
      { caseId: "gs-02", caseName: "基础数学加法", passed: true, durationMs: 220, details: { expected: "4", actualSnippet: "2 + 2 = 4" } },
      { caseId: "gs-03", caseName: "地理常识问答", passed: true, durationMs: 310, details: { expected: "Paris", actualSnippet: "The capital of France is Paris." } },
      { caseId: "gs-04", caseName: "JSON 格式严谨性", passed: true, durationMs: 410, details: { expected: '"status": "ok"', actualSnippet: '{"status": "ok"}' } },
      { caseId: "gs-05", caseName: "Python 代码生成", passed: true, durationMs: 480, details: { expected: "def ", actualSnippet: "def hello_world():\n    print('Hello, world!')" } },
    ],
    outputs: {
      "gs-01": "Hello! How can I help you today?",
      "gs-02": "2 + 2 = 4",
      "gs-03": "The capital of France is Paris.",
      "gs-04": '{"status": "ok"}',
      "gs-05": "def hello_world():\n    print('Hello, world!')",
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const evalsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/evals
  app.get("/evals", async (_req, reply) => {
    const allSuites = [...builtInSuites, ...customSuites];

    const scorecard: EvalScorecard = {
      suites: allSuites.length,
      totalCases: allSuites.reduce((sum, s) => sum + (s.cases?.length || s.caseCount || 0), 0),
      totalPassed: 5,
      overallPassRate: 100,
      perSuite: allSuites.map((s) => ({
        id: s.id,
        name: s.name,
        passRate: 100,
      })),
    };

    const targets = [
      {
        key: "suite-default:__default__",
        type: "suite-default" as const,
        id: null,
        label: "套件默认目标模型",
        description: "使用各个测试用例中指定的对应模型分别运行测试",
      },
      {
        key: "model:gpt-4o",
        type: "model" as const,
        id: "gpt-4o",
        label: "模型: gpt-4o",
        description: "强制使用当前路由的 gpt-4o 执行全部测试",
      },
      {
        key: "model:claude-sonnet-4-20250514",
        type: "model" as const,
        id: "claude-sonnet-4-20250514",
        label: "模型: claude-sonnet-4",
        description: "强制使用 claude-sonnet-4 执行全部测试",
      },
      {
        key: "model:gemini-2.5-flash",
        type: "model" as const,
        id: "gemini-2.5-flash",
        label: "模型: gemini-2.5-flash",
        description: "强制使用 gemini-2.5-flash 执行全部测试",
      },
      {
        key: "combo:default-chat",
        type: "combo" as const,
        id: "default-chat",
        label: "组合: default-chat",
        description: "通过 default-chat 组合自动路由策略执行测试",
      },
    ];

    const apiKeys = [
      { id: "key-dev", name: "系统默认管理密钥", isActive: true },
    ];

    return reply.send({
      suites: allSuites,
      recentRuns,
      scorecard,
      targets,
      apiKeys,
    });
  });

  // POST /api/evals — 运行评测
  app.post("/evals", async (req, reply) => {
    const body = (req.body || {}) as {
      suiteId: string;
      target?: { type: "suite-default" | "model" | "combo"; id: string | null };
      compareTarget?: { type: "suite-default" | "model" | "combo"; id: string | null };
      apiKeyId?: string;
    };

    const allSuites = [...builtInSuites, ...customSuites];
    const suite = allSuites.find((s) => s.id === body.suiteId) || builtInSuites[0];
    const cases = suite.cases || [];

    const targetType = body.target?.type || "suite-default";
    const targetId = body.target?.id || null;
    const targetLabel = targetType === "suite-default" ? "套件默认目标模型" : `${targetType}: ${targetId}`;

    const results: EvalResult[] = cases.map((c) => ({
      caseId: c.id,
      caseName: c.name,
      passed: true,
      durationMs: Math.floor(Math.random() * 300) + 120,
      details: {
        expected: c.expected?.value || "ok",
        actualSnippet: `[Mock Verified Output] ${c.expected?.value || "Success"} for ${c.name}`,
      },
    }));

    const newRun: EvalRun = {
      id: `run-${randomUUID().slice(0, 8)}`,
      runGroupId: null,
      suiteId: suite.id,
      suiteName: suite.name,
      target: {
        type: targetType,
        id: targetId,
        key: `${targetType}:${targetId || "__default__"}`,
        label: targetLabel,
      },
      avgLatencyMs: Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / (results.length || 1)),
      summary: {
        total: results.length,
        passed: results.length,
        failed: 0,
        passRate: 100,
      },
      results,
      outputs: Object.fromEntries(results.map((r) => [r.caseId, `Mock output content for ${r.caseName}`])),
      createdAt: new Date().toISOString(),
    };

    recentRuns = [newRun, ...recentRuns.slice(0, 19)];

    return reply.send({
      runs: [newRun],
      scorecard: {
        suites: allSuites.length,
        totalCases: results.length,
        totalPassed: results.length,
        overallPassRate: 100,
        perSuite: [{ id: suite.id, name: suite.name, passRate: 100 }],
      },
    });
  });

  // POST /api/evals/suites — 创建自定义测试套件
  app.post("/evals/suites", async (req, reply) => {
    const body = (req.body || {}) as {
      id?: string;
      name: string;
      description?: string;
      cases: Array<{
        name: string;
        model?: string;
        userPrompt?: string;
        systemPrompt?: string;
        strategy?: string;
        expectedValue?: string;
        tags?: string;
      }>;
    };

    const suiteId = body.id || `custom-${randomUUID().slice(0, 8)}`;
    const newSuite: EvalSuite = {
      id: suiteId,
      name: body.name || "自定义评测套件",
      description: body.description || "",
      source: "custom",
      caseCount: (body.cases || []).length,
      cases: (body.cases || []).map((c, idx) => ({
        id: `case-${idx + 1}`,
        name: c.name || `Case ${idx + 1}`,
        model: c.model || "gpt-4o",
        input: {
          messages: [
            ...(c.systemPrompt ? [{ role: "system", content: c.systemPrompt }] : []),
            { role: "user", content: c.userPrompt || "Hello" },
          ],
        },
        expected: {
          strategy: c.strategy || "contains",
          value: c.expectedValue || "",
        },
        tags: c.tags ? c.tags.split(",").map((t) => t.trim()) : [],
      })),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = customSuites.findIndex((s) => s.id === suiteId);
    if (existingIdx >= 0) {
      customSuites[existingIdx] = newSuite;
    } else {
      customSuites.push(newSuite);
    }

    return reply.send(newSuite);
  });

  // DELETE /api/evals/suites/:id
  app.delete("/evals/suites/:id", async (req, reply) => {
    const params = req.params as { id: string };
    customSuites = customSuites.filter((s) => s.id !== params.id);
    return reply.send({ success: true });
  });
};
