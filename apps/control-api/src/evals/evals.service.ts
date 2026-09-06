import { Injectable, type OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  getEvalScorecard,
  listEvalRuns,
  saveCustomEvalSuite,
  getCustomEvalSuite,
  deleteCustomEvalSuite,
} from "@shiguang-gateway/core-domain/evals/db";
import { getApiKeys } from "@shiguang-gateway/core-domain/db/api-keys";
import { listSuites, getSuite, runSuite, createScorecard } from "@shiguang-gateway/core-domain/evals/runner";
import { buildEvalTargetOptions, runEvalSuiteAgainstTarget } from "@shiguang-gateway/core-domain/evals/runtime";
import { forwardEdgeHttpRequest } from "../edge-runtime/client.js";
import { ensureEvalsSchema } from "./evals-schema.js";

@Injectable()
export class EvalsService implements OnModuleInit {
  onModuleInit(): void {
    ensureEvalsSchema();
  }

  async getEvalsOverview() {
    const [suites, recentRuns, scorecard, targets, apiKeys] = await Promise.all([
      Promise.resolve(listSuites()),
      Promise.resolve(listEvalRuns({ limit: 20 })),
      Promise.resolve(getEvalScorecard({ limit: 50 })),
      buildEvalTargetOptions(),
      getApiKeys(),
    ]);

    return {
      suites,
      recentRuns,
      scorecard,
      targets,
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        isActive: key.isActive !== false,
      })),
    };
  }

  async runSuite(data: {
    suiteId: string;
    outputs?: Record<string, any>;
    target?: any;
    compareTarget?: any;
    apiKeyId?: string | null;
  }) {
    const { suiteId, outputs, target, compareTarget, apiKeyId } = data;

    if (outputs && Object.keys(outputs).length > 0) {
      return runSuite(suiteId, outputs);
    }

    const targetsToRun = [target || { type: "suite-default" as const, id: null }];
    if (compareTarget) {
      targetsToRun.push(compareTarget);
    }

    const runGroupId = targetsToRun.length > 1 ? randomUUID() : null;
    const runs = await Promise.all(
      targetsToRun.map((entry) =>
        runEvalSuiteAgainstTarget({
          suiteId,
          target: entry,
          apiKeyId,
          runGroupId,
        }, forwardEdgeHttpRequest)
      )
    );

    const scorecard =
      runs.length > 0
        ? createScorecard(
            runs.map((run) => ({
              suiteId: `${run.suiteId}:${run.target.key}`,
              suiteName: `${run.suiteName} · ${run.target.label}`,
              results: run.results,
              summary: run.summary,
            }))
          )
        : null;

    return {
      suiteId,
      runGroupId,
      runs,
      scorecard,
      recentRuns: listEvalRuns({ limit: 20 }),
      historyScorecard: getEvalScorecard({ limit: 50 }),
    };
  }

  getSuiteById(suiteId: string) {
    return getSuite(suiteId);
  }

  createSuite(data: any) {
    return saveCustomEvalSuite(data);
  }

  getCustomSuite(suiteId: string) {
    return getCustomEvalSuite(suiteId);
  }

  updateCustomSuite(suiteId: string, data: any) {
    return saveCustomEvalSuite({ ...data, id: suiteId });
  }

  deleteCustomSuite(suiteId: string) {
    return deleteCustomEvalSuite(suiteId);
  }
}
