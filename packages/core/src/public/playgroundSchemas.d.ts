import type { z } from "zod";

export const PlaygroundPresetCreateSchema: z.ZodType<any>;
export const PlaygroundPresetUpdateSchema: z.ZodType<any>;
export const PlaygroundPresetRowSchema: z.ZodType<any>;
export const PlaygroundPresetListItemSchema: z.ZodType<any>;
export const ToolDefinitionSchema: z.ZodType<any>;
export const StructuredOutputSchema: z.ZodType<any>;
export const StreamMetricsSchema: z.ZodType<any>;
export type PlaygroundPresetListItem = Record<string, unknown>;
export type StreamMetrics = Record<string, unknown>;
