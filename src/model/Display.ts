import { ParticipatingPlayer } from "./Tournament.ts";

/**
 * Performance badge type
 */
export type PerformanceBadge = "💯" | "🔥" | undefined;

/**
 * Get a performance badge for a player based on their win ratio
 * - 💯 for 100% win rate
 * - 🔥 for >= 75% win rate  
 * - undefined for < 75% win rate or no matches played
 */
export function getPerformanceBadge(player: ParticipatingPlayer): PerformanceBadge {
  // Don't show badge if no matches played
  const totalGames = player.wins + player.losses + player.draws;
  if (totalGames === 0) return undefined;

  // 100% win rate → 💯
  if (player.winRatio === 1.0) return "💯";

  // >= 75% win rate → 🔥
  if (player.winRatio >= 0.75) return "🔥";

  // < 75% → no badge
  return undefined;
}
