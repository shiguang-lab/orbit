import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

/** OpenAI-compatible JSON payload accepted by POST /v1/audio/speech. */
export const audioSpeechSchema = z
  .object({
    model: nonEmptyString,
    input: nonEmptyString,
  })
  .catchall(z.unknown());

export function formatValidationError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

