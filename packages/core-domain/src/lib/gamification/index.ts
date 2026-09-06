/**
 * Gamification module — barrel export.
 *
 * @module lib/gamification
 */

export { emitGamificationEvent } from "./events.js";
export {
  updateScore,
  getRank,
  getTopN,
  getNeighbors,
  rotateScope,
  type LeaderboardScope,
  type LeaderboardEntry,
} from "./leaderboard.js";
export { validateScoreChange, getAnomalies } from "./antiCheat.js";
export { BUILTIN_BADGES, seedBuiltinBadges } from "./badges.js";
export {
  xpForLevel,
  cumulativeXpForLevel,
  calculateLevel,
  xpToNextLevel,
  getLevelTitle,
  getLevelTier,
  XP_REWARDS,
  type XpAction,
} from "./xp.js";
export { updateStreak } from "./streaks.js";
export {
  recordBadgeUnlock,
  consumeBadgeUnlocks,
  createBadgeNotificationStream,
} from "./notifications.js";
export { transferTokens, getBalance, getHistory } from "./sharing.js";
export { createInvite, redeemInvite as redeemInviteCode, listInvites, revokeInvite } from "./invites.js";
export { connectServer, disconnectServer, listServers } from "./servers.js";

export { getBadges, getBadgeDefinitions, getXp, getConnectedServerByKeyHash } from "../db/gamification.js";
