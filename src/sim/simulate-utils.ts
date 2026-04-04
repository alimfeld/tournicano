/**
 * Shared utilities for Tournicano simulation tests.
 * Used by src/sim/simulate-matching.test.ts and src/sim/simulate-two-stage.test.ts.
 */

import { Tournament, ParticipatingPlayer, Score } from "../model/tournament/Tournament.ts";

// ============================================================================
// Skill assignment
// ============================================================================

/**
 * Assign skill levels 1..N to players in the tournament.
 * Player index 0 = weakest (skill 1), player index N-1 = strongest (skill N).
 * Returns a map: playerId -> skill (1..N)
 */
export function assignSkills(tournament: Tournament): Map<string, number> {
  const players = tournament.players();
  const skills = new Map<string, number>();
  players.forEach((player, i) => {
    skills.set(player.id, i + 1); // skill 1..N
  });
  return skills;
}

// ============================================================================
// Score generation
// ============================================================================

/**
 * Generate a score based on combined skill difference, with optional random noise.
 *
 * Without noise (default): deterministic — winner always gets 11, loser gets max(0, 11 - diff).
 * With noise: each side's raw score is perturbed by ±noise before clamping to [0, 11].
 * The stronger team still tends to win, but upsets are possible.
 *
 * teamA wins if its combined skill >= teamB combined skill (before noise).
 * Returns [teamA score, teamB score].
 */
export function generateScore(teamASkill: number, teamBSkill: number, noise = 0): Score {
  const diff = teamASkill - teamBSkill;

  let winnerRaw = 11;
  let loserRaw: number;

  if (diff >= 0) {
    loserRaw = Math.max(0, 11 - diff);
  } else {
    loserRaw = Math.max(0, 11 + diff); // diff is negative
  }

  if (noise > 0) {
    const nA = Math.round((Math.random() - 0.5) * 2 * noise);
    const nB = Math.round((Math.random() - 0.5) * 2 * noise);
    winnerRaw = Math.min(11, Math.max(0, winnerRaw + nA));
    loserRaw  = Math.min(11, Math.max(0, loserRaw  + nB));
    // If noise flipped the result, swap so the score tuple is still [A, B]
  }

  if (diff >= 0) {
    return [winnerRaw, loserRaw];
  } else {
    return [loserRaw, winnerRaw];
  }
}

// ============================================================================
// Metric computation
// ============================================================================

/**
 * Spearman rank correlation between skill ranking and tournament standings.
 *
 * skillOrderDesc: player IDs sorted strongest-first (index 0 = best player)
 * standingOrderDesc: player IDs sorted by tournament standing, best-first (index 0 = rank 1)
 *
 * Both arrays use the same ordering convention: index 0 = rank 1 (best).
 * Returns value in [-1, 1]. 1 = perfect correlation.
 */
export function spearmanCorrelation(skillOrderDesc: string[], standingOrderDesc: string[]): number {
  const n = skillOrderDesc.length;
  if (n < 2) return 1;

  const skillRankMap = new Map<string, number>();
  skillOrderDesc.forEach((playerId, i) => {
    skillRankMap.set(playerId, i + 1);
  });

  let dSquaredSum = 0;
  standingOrderDesc.forEach((playerId, i) => {
    const skillRank = skillRankMap.get(playerId) ?? 0;
    const standingRank = i + 1;
    const d = skillRank - standingRank;
    dSquaredSum += d * d;
  });

  return 1 - (6 * dSquaredSum) / (n * (n * n - 1));
}

/**
 * Analyze partner variety: unique partner rate and max repeat count.
 */
export function analyzePartnerVariety(players: ParticipatingPlayer[]): {
  uniqueRate: number;
  maxRepeats: number;
} {
  const partnerCounts = new Map<string, number>();
  players.forEach((p) => {
    p.partners.forEach((rounds, partnerId) => {
      const pairKey = [p.id, partnerId].sort().join("-");
      partnerCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(partnerCounts.values());
  if (counts.length === 0) return { uniqueRate: 1, maxRepeats: 0 };

  const uniqueCount = counts.filter((c) => c === 1).length;
  const uniqueRate = uniqueCount / counts.length;
  const maxRepeats = Math.max(...counts);
  return { uniqueRate, maxRepeats };
}

/**
 * Analyze opponent variety: unique opponent pair rate and max repeat count.
 * A pair of opponents is the set of two players on the opposing team in a match.
 */
export function analyzeOpponentVariety(players: ParticipatingPlayer[]): {
  uniqueRate: number;
  maxRepeats: number;
} {
  const opponentCounts = new Map<string, number>();
  players.forEach((p) => {
    p.opponents.forEach((rounds, opponentId) => {
      const pairKey = [p.id, opponentId].sort().join("-");
      opponentCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(opponentCounts.values());
  if (counts.length === 0) return { uniqueRate: 1, maxRepeats: 0 };

  const uniqueCount = counts.filter((c) => c === 1).length;
  const uniqueRate = uniqueCount / counts.length;
  const maxRepeats = Math.max(...counts);
  return { uniqueRate, maxRepeats };
}

/**
 * Analyze match competitiveness: avg absolute skill difference and % balanced matches.
 */
export function analyzeMatchCompetitiveness(
  rounds: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>>,
): {
  avgSkillDiff: number;
  pctBalancedMatches: number;
} {
  let totalDiff = 0;
  let balancedCount = 0;
  let totalMatches = 0;

  for (const round of rounds) {
    for (const match of round) {
      const diff = Math.abs(match.teamACombinedSkill - match.teamBCombinedSkill);
      totalDiff += diff;
      if (diff <= 2) balancedCount++;
      totalMatches++;
    }
  }

  return {
    avgSkillDiff: totalMatches > 0 ? totalDiff / totalMatches : 0,
    pctBalancedMatches: totalMatches > 0 ? balancedCount / totalMatches : 0,
  };
}

// ============================================================================
// Output formatting
// ============================================================================

export function printSeparator(width: number): void {
  console.log("─".repeat(width));
}

export function pad(str: string, width: number, align: "left" | "right" = "left"): string {
  if (align === "right") return str.padStart(width);
  return str.padEnd(width);
}
