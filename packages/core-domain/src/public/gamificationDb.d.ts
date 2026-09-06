export interface UserLevelRow { apiKeyId: string; totalXp: number; currentLevel: number; updatedAt: string; }
export interface UserBadge { apiKeyId: string; badgeId: string; unlockedAt: string; [key: string]: unknown; }
export function getBadges(apiKeyId: string): UserBadge[];
export function getBadgeDefinitions(category?: string): unknown[];
export function getXp(apiKeyId: string): UserLevelRow | null;
export function getConnectedServerByKeyHash(apiKeyHash: string): { id: string } | undefined;
