import { z } from "zod";

const configSchema = z.record(z.string(), z.unknown());
const common = {
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  config: configSchema,
  batchSize: z.number().int().min(1).max(10_000).optional(),
  includeBodies: z.boolean().optional(),
  maxBodyBytes: z.number().int().min(1_024).max(10 * 1024 * 1024).optional(),
  maxRowsPerRun: z.number().int().min(1).max(1_000_000).optional(),
};

export const createLogExportDestinationSchema = z.object({
  ...common,
  type: z.string().trim().min(1).max(80),
});

export const updateLogExportDestinationSchema = z.object(common).partial();
