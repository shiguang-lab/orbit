export function listSemanticCacheEntries(options: { page?: number; limit?: number; search?: string; model?: string; sortBy?: string; sortOrder?: string }): { entries: any[]; total: number };
export function deleteSemanticCacheBySignature(signature: string): { deleted: boolean };
export function deleteSemanticCacheByModel(model: string): { deleted: number };
