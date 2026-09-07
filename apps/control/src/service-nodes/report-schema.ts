import { z } from "zod";
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/);
// Strip unrecognized properties, especially credentials, before persistence or display.
export const nodeReportSchema = z.object({
  nodeId: id,
  name: z.string().max(128),
  os: z.string().max(32),
  arch: z.string().max(32),
  managerVersion: z.string().max(64),
  uptimeSeconds: z.number().nonnegative(),
  observedAt: z.iso.datetime(),
  metrics: z.object({
    managerHeapBytes: z.number().nonnegative(),
    diskAvailableBytes: z.number().nonnegative().optional(),
    memoryTotalBytes: z.number().nonnegative().optional(),
    memoryAvailableBytes: z.number().nonnegative().optional(),
    load1: z.number().nonnegative().optional(),
  }),
  reportError: z.string().max(1000).optional(),
  instances: z
    .array(
      z.object({
        id,
        autoStart: z.boolean().optional(),
        providerExpose: z.boolean().optional(),
        catalogError: z.string().max(1000).optional(),
        credentials: z
          .array(
            z.object({
              id: z.string().min(1).max(512),
              instanceId: id,
              name: z.string().min(1).max(512),
              provider: z.string().max(128),
              disabled: z.boolean(),
              routable: z.boolean(),
              error: z.string().max(1000).optional(),
              models: z.array(z.string().min(1).max(512)).max(5000),
            }),
          )
          .max(1000)
          .nullish(),
        name: z.string().max(128),
        port: z.number().int().min(1024).max(65535),
        version: z.string().max(64),
        desiredState: z.enum(["running", "stopped"]),
        state: z.enum([
          "not_installed",
          "stopped",
          "starting",
          "running",
          "stopping",
          "unhealthy",
          "error",
        ]),
        healthy: z.boolean(),
        latencyMs: z.number().nonnegative(),
        pid: z.number().int().nonnegative(),
        restartCount: z.number().int().nonnegative(),
        lastError: z.string().max(2000).optional(),
        startedAt: z.iso.datetime().optional(),
        checkedAt: z.iso.datetime().optional(),
      }),
    )
    .max(500),
  jobs: z
    .array(
      z.object({
        id,
        instanceId: id,
        action: z.enum(["install", "upgrade", "start", "stop", "restart"]),
        version: z.string().max(64).optional(),
        status: z.enum(["running", "succeeded", "failed"]),
        error: z.string().max(4000).optional(),
        createdAt: z.iso.datetime(),
        finishedAt: z.iso.datetime().optional(),
      }),
    )
    .max(50),
});
export const createNodeSchema = z.object({
  id: id.optional(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[^\r\n]+$/),
  endpoint: z.url(),
});
