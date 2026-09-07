export function getHiddenModelsByProvider(): Map<string, Set<string>>;
export function getModelIsHidden(providerId: string, modelId: string): boolean;
export function setModelIsHidden(providerId: string, modelId: string, hidden: boolean): void;
