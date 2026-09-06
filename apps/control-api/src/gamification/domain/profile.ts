/**
 * Control-plane gamification profile queries.
 *
 * These aggregate views are only used by the control API's operator profile
 * endpoints. Keep them next to the control app instead of exporting them from
 * the shared/core-domain DB facade.
 */

import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";
import { calculateLevel } from "@shiguang-gateway/core-domain/gamification/rules";

export interface UserLevelProfile {
  apiKeyId: string;
  totalXp: number;
  currentLevel: number;
  updatedAt: string;
}

export interface EarnedBadgeProfile {
  apiKeyId: string;
  badgeId: string;
  unlockedAt: string;
  badgeName?: string;
  badgeDescription?: string | null;
  badgeIcon?: string | null;
  badgeCategory?: string | null;
  badgeRarity?: string;
}

/** Aggregate XP across all API keys for the operator-wide profile view. */
export function getAggregateXp(): UserLevelProfile {
  const row = getDbInstance()
    .prepare(
      `SELECT COALESCE(SUM(total_xp), 0) AS total_xp,
              MAX(updated_at) AS updated_at
       FROM user_levels`
    )
    .get() as { total_xp: number; updated_at: string | null };

  const totalXp = row?.total_xp ?? 0;
  return {
    apiKeyId: "*",
    totalXp,
    currentLevel: calculateLevel(totalXp),
    updatedAt: row?.updated_at ?? "",
  };
}

/** Distinct badges earned by any API key, retaining the earliest unlock. */
export function getAllEarnedBadges(): EarnedBadgeProfile[] {
  const rows = getDbInstance()
    .prepare(
      `SELECT ub.badge_id, MIN(ub.unlocked_at) AS unlocked_at,
              bd.name, bd.description, bd.icon, bd.category, bd.rarity
       FROM user_badges ub
       JOIN badge_definitions bd ON bd.id = ub.badge_id
       GROUP BY ub.badge_id`
    )
    .all() as Array<{
    badge_id: string;
    unlocked_at: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string | null;
    rarity: string;
  }>;

  return rows.map((row) => ({
    apiKeyId: "*",
    badgeId: row.badge_id,
    unlockedAt: row.unlocked_at,
    badgeName: row.name,
    badgeDescription: row.description,
    badgeIcon: row.icon,
    badgeCategory: row.category,
    badgeRarity: row.rarity,
  }));
}
