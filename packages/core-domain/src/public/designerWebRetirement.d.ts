export function isMicrosoftDesignerWebProviderRetiredError(
  error: unknown,
): error is Error & { status: 410 };

