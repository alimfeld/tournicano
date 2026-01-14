import { Player, Team } from "./Matching.ts";
import {
  TeamUpGroupMode,
  MatchUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";

// Constants
const MEXICANO_RANK_DIFF = 2; // In Mexicano mode, pair 1st with 3rd, 2nd with 4th (rank diff = 2)

// ============================================================================
// Penalty Scaling Factors
// ============================================================================
// These constants control the hierarchical weighting of different penalty components.
// Higher scale = stronger influence on the matching algorithm.
// All individual factors are normalized to [0, 1] range before scaling.

// PARTNER PENALTY HIERARCHY (from highest to lowest impact):
// 1. FREQUENCY - Partnership frequency rate (dominates all)
// 2. RECENCY - How recently they partnered (prevents back-to-back)
// 3. SATURATION - Partner history variety (tiebreaker)
const PARTNER_FREQUENCY_SCALE = 5;
const PARTNER_RECENCY_SCALE = 3;
const PARTNER_SATURATION_SCALE = 1;

// OPPONENT PENALTY HIERARCHY (from highest to lowest impact):
// 1. FREQUENCY - Opponent encounter frequency rate (dominates)
// 2. RECENCY - How recently opponents faced (secondary)
// 3. SATURATION - Opponent history variety (tiebreaker)
const OPPONENT_FREQUENCY_SCALE = 5;
const OPPONENT_RECENCY_SCALE = 3;
const OPPONENT_SATURATION_SCALE = 1;

// Group pairing penalties
const TEAM_UP_GROUP_SAME_PENALTY = -1; // Penalty for same group pairing
const TEAM_UP_GROUP_WRONG_PAIRING_PENALTY = -2; // Penalty for wrong group pairing

// ============================================================================
// Team Up Weight Functions
// ============================================================================

export const curriedTeamUpGroupWeight = (mode: TeamUpGroupMode) => {
  return (a: { entity: Player }, b: { entity: Player }): number => {
    switch (mode) {
      case TeamUpGroupMode.SAME:
        return -Math.abs(a.entity.group - b.entity.group);
      case TeamUpGroupMode.PAIRED:
        // Favor pairs: (0,1) and (2,3) i.e. (A,B) and (C,D)
        // Penalize wrong pairings like (1,2) i.e. (B,C)
        const groupDiff = Math.abs(a.entity.group - b.entity.group);
        const pairBlockA = Math.floor(a.entity.group / 2);
        const pairBlockB = Math.floor(b.entity.group / 2);
        const samePairBlock = pairBlockA === pairBlockB;
        const pairOffset = Math.abs((a.entity.group % 2) - (b.entity.group % 2));
        if (groupDiff === 1 && pairOffset === 1 && samePairBlock) {
          // Perfect pair: 0-1 or 2-3 (A&B or C&D) within same pair block
          return 0;
        } else if (groupDiff === 0) {
          // Same group: moderate penalty
          return TEAM_UP_GROUP_SAME_PENALTY;
        } else {
          // Wrong pairing (e.g., 1-2 / B&C) or distant groups: heavy penalty
          return TEAM_UP_GROUP_WRONG_PAIRING_PENALTY;
        }
    }
  };
};

/**
 * Calculates the saturation rate of a player's partnership history.
 * This measures how many repeated partnerships occurred relative to participation.
 *
 * Returns a normalized rate [0, 1]: totalRepetitions / participation
 * where totalRepetitions = sum over all partners of (partnershipCount - 1)
 *
 * Example: If partnered with A(2x), B(1x), C(1x) over 10 rounds participation:
 *   totalRepetitions = (2-1) + (1-1) + (1-1) = 1
 *   saturation rate = 1/10 = 0.1
 *
 * Players with high saturation (many repeated partnerships relative to participation)
 * should be encouraged to find new partners.
 */
const calculatePartnerSaturation = (player: Player): number => {
  const partnerCounts = Array.from(player.partners.values());
  const totalRepetitions = partnerCounts.reduce((acc, rounds) => acc + rounds.length - 1, 0);
  const participation = Math.max(1, player.matchCount + player.pauseCount);
  return totalRepetitions / participation;
};

/**
 * Calculates a penalty for two players having partnered together before.
 * Higher penalty = less desirable pairing.
 *
 * Uses normalized factors [0, 1] with hierarchical scaling:
 * 1. FREQUENCY (×PARTNER_FREQUENCY_SCALE): Partnership frequency rate (dominates all)
 *    - Rate per player: repetitions / participation
 *    - Combined: MAX of both players' rates (prevents asymmetric repetition)
 * 2. RECENCY (×PARTNER_RECENCY_SCALE): How recently did they partner? (secondary)
 *    - Inverse normalized: 1 / (roundsSince + 1)
 *    - Round-independent: same time gap = same penalty regardless of tournament length
 * 3. SATURATION (×PARTNER_SATURATION_SCALE): Partner history variety (tiebreaker)
 *    - Rate per player: totalRepetitions / participation
 *    - Combined: average of both players' rates
 *
 * All factors are normalized to [0, 1] range before applying scale constants.
 */
const calculatePartnerPenalty = (
  playerA: Player,
  playerB: Player,
  currentRoundIndex: number,
): number => {
  const roundsTeamedUp = playerA.partners.get(playerB.id) || [];

  if (roundsTeamedUp.length === 0) {
    return 0; // Never partnered - no penalty
  }

  const repetitions = roundsTeamedUp.length;
  const participationA = Math.max(1, playerA.matchCount + playerA.pauseCount);
  const participationB = Math.max(1, playerB.matchCount + playerB.pauseCount);

  // 1. FREQUENCY: Partnership frequency rate [0, 1]
  //    Use MAX to prevent new players from being stuck with same partner
  const frequencyRateA = repetitions / participationA;
  const frequencyRateB = repetitions / participationB;
  const frequencyFactor = Math.max(frequencyRateA, frequencyRateB);

  // 2. RECENCY: Inverse normalized [0, 1]
  //    1 = partnered last round (maximum penalty), approaches 0 for distant partnerships
  const lastRoundIndex = roundsTeamedUp[roundsTeamedUp.length - 1]!;
  const roundsSince = Math.max(0, currentRoundIndex - lastRoundIndex);
  const recencyFactor = 1 / (roundsSince + 1);

  // 3. SATURATION: Partner history saturation rate [0, 1]
  //    Average saturation rate of both players
  const saturationRateA = calculatePartnerSaturation(playerA);
  const saturationRateB = calculatePartnerSaturation(playerB);
  const saturationFactor = (saturationRateA + saturationRateB) / 2;

  // Hierarchical penalty: simple weighted sum of normalized factors
  // FREQUENCY (×PARTNER_FREQUENCY_SCALE) > RECENCY (×PARTNER_RECENCY_SCALE) > SATURATION (×PARTNER_SATURATION_SCALE)
  return (frequencyFactor * PARTNER_FREQUENCY_SCALE) +
    (recencyFactor * PARTNER_RECENCY_SCALE) +
    (saturationFactor * PARTNER_SATURATION_SCALE);
};

export const curriedTeamUpVarietyWeight = (currentRoundIndex: number) => {
  return (a: { entity: Player }, b: { entity: Player }): number => {
    // Calculate penalty for having partnered before
    const partnerPenalty = calculatePartnerPenalty(a.entity, b.entity, currentRoundIndex);

    // Return negative because we want to MAXIMIZE weight for good pairings (minimize penalty)
    // The match() function handles normalization to [0,1] range automatically
    return -partnerPenalty;
  };
};

export const curriedTeamUpPerformanceWeight = (
  mode: TeamUpPerformanceMode,
  competitorCount: number,
) => {
  return (a: { rank: number }, b: { rank: number }) => {
    const rankDiff = Math.abs(b.rank - a.rank);
    switch (mode) {
      case TeamUpPerformanceMode.EQUAL:
        return -(rankDiff);
      case TeamUpPerformanceMode.AVERAGE:
        return -Math.abs(competitorCount - 1 - rankDiff);
      case TeamUpPerformanceMode.MEXICANO:
        return -Math.abs(rankDiff - MEXICANO_RANK_DIFF);
    }
  };
};

// ============================================================================
// Match Up Weight Functions
// ============================================================================

export const curriedMatchUpGroupWeight = (mode: MatchUpGroupMode) => {
  return (a: { entity: Team }, b: { entity: Team }) => {
    const diff =
      a.entity[0].group +
      a.entity[1].group -
      b.entity[0].group -
      b.entity[1].group;
    switch (mode) {
      case MatchUpGroupMode.SAME:
        return -Math.abs(diff); // minimize difference (current behavior)
      case MatchUpGroupMode.CROSS:
        return Math.abs(diff); // maximize difference (cross-group matching)
    }
  };
};

/**
 * Calculates the saturation rate of a player's opponent history.
 * This measures how many repeated opponent encounters occurred relative to participation.
 *
 * Returns a normalized rate [0, 1]: totalRepetitions / participation
 * where totalRepetitions = sum over all opponents of (encounterCount - 1)
 *
 * Players with high saturation (many repeated opponent encounters relative to participation)
 * have faced the same opponents multiple times.
 */
const calculateOpponentSaturation = (player: Player): number => {
  const opponentCounts = Array.from(player.opponents.values());
  const totalRepetitions = opponentCounts.reduce((acc, rounds) => acc + rounds.length - 1, 0);
  const participation = Math.max(1, player.matchCount + player.pauseCount);
  return totalRepetitions / participation;
};

/**
 * Calculates a penalty for two teams having played against each other before.
 * Higher penalty = less desirable match-up.
 *
 * Uses normalized factors [0, 1] with hierarchical scaling:
 * 1. FREQUENCY (×OPPONENT_FREQUENCY_SCALE): Opponent encounter frequency (dominates)
 *    - Rate per player: (encounters with both opponents) / participation
 *    - Combined: MAX of all 4 players' average frequency rates (catches hotspots)
 *    - Leverages symmetry: encounter counts are symmetric but rates differ per player
 * 2. RECENCY (×OPPONENT_RECENCY_SCALE): How recently opponents faced (secondary)
 *    - Per player-pair: 1 / (roundsSince + 1)
 *    - Combined: average of 4 unique pair recencies (a0↔b0, a0↔b1, a1↔b0, a1↔b1)
 *    - Leverages symmetry: only calculate 4 combinations, not 8
 * 3. SATURATION (×OPPONENT_SATURATION_SCALE): Opponent history variety (tiebreaker)
 *    - Rate per player: totalOpponentRepetitions / participation
 *    - Combined: average of all 4 players' saturation rates
 *
 * All factors are normalized to [0, 1] range before applying scale constants.
 */
const calculateOpponentTeamPenalty = (
  teamA: Team,
  teamB: Team,
  currentRoundIndex: number,
): number => {
  // Get individual opponent histories for all 4 combinations
  const a0b0Rounds = teamA[0].opponents.get(teamB[0].id) || [];
  const a0b1Rounds = teamA[0].opponents.get(teamB[1].id) || [];
  const a1b0Rounds = teamA[1].opponents.get(teamB[0].id) || [];
  const a1b1Rounds = teamA[1].opponents.get(teamB[1].id) || [];

  const totalEncounters = a0b0Rounds.length + a0b1Rounds.length +
    a1b0Rounds.length + a1b1Rounds.length;

  if (totalEncounters === 0) {
    return 0; // Never faced each other - no penalty
  }

  // 1. FREQUENCY: Calculate per-player average frequency rates [0, 1]
  //    Encounter counts are symmetric, but rates differ based on participation
  //    Use MAX to catch repetition hotspots and prevent concentrated repetitions
  const participationA0 = Math.max(1, teamA[0].matchCount + teamA[0].pauseCount);
  const participationA1 = Math.max(1, teamA[1].matchCount + teamA[1].pauseCount);
  const participationB0 = Math.max(1, teamB[0].matchCount + teamB[0].pauseCount);
  const participationB1 = Math.max(1, teamB[1].matchCount + teamB[1].pauseCount);

  // Team A, Player 0: average frequency with both opponents
  const freqA0vsB0 = a0b0Rounds.length / participationA0;
  const freqA0vsB1 = a0b1Rounds.length / participationA0;
  const avgFreqA0 = (freqA0vsB0 + freqA0vsB1) / 2;

  // Team A, Player 1: average frequency with both opponents
  const freqA1vsB0 = a1b0Rounds.length / participationA1;
  const freqA1vsB1 = a1b1Rounds.length / participationA1;
  const avgFreqA1 = (freqA1vsB0 + freqA1vsB1) / 2;

  // Team B, Player 0: average frequency with both opponents (symmetric encounters)
  const freqB0vsA0 = a0b0Rounds.length / participationB0; // same encounters as freqA0vsB0
  const freqB0vsA1 = a1b0Rounds.length / participationB0; // same encounters as freqA1vsB0
  const avgFreqB0 = (freqB0vsA0 + freqB0vsA1) / 2;

  // Team B, Player 1: average frequency with both opponents (symmetric encounters)
  const freqB1vsA0 = a0b1Rounds.length / participationB1; // same encounters as freqA0vsB1
  const freqB1vsA1 = a1b1Rounds.length / participationB1; // same encounters as freqA1vsB1
  const avgFreqB1 = (freqB1vsA0 + freqB1vsA1) / 2;

  // MAX of all 4 players' average frequencies - catches repetition hotspots
  const frequencyFactor = Math.max(avgFreqA0, avgFreqA1, avgFreqB0, avgFreqB1);

  // 2. RECENCY: Calculate per-combination recency [0, 1]
  //    4 unique pairs due to symmetry
  const lastA0B0 = a0b0Rounds.at(-1) ?? -1;
  const lastA0B1 = a0b1Rounds.at(-1) ?? -1;
  const lastA1B0 = a1b0Rounds.at(-1) ?? -1;
  const lastA1B1 = a1b1Rounds.at(-1) ?? -1;

  const recencyA0B0 = lastA0B0 >= 0 ? 1 / (currentRoundIndex - lastA0B0 + 1) : 0;
  const recencyA0B1 = lastA0B1 >= 0 ? 1 / (currentRoundIndex - lastA0B1 + 1) : 0;
  const recencyA1B0 = lastA1B0 >= 0 ? 1 / (currentRoundIndex - lastA1B0 + 1) : 0;
  const recencyA1B1 = lastA1B1 >= 0 ? 1 / (currentRoundIndex - lastA1B1 + 1) : 0;

  // Average of all 4 unique pair recencies
  const recencyFactor = (recencyA0B0 + recencyA0B1 + recencyA1B0 + recencyA1B1) / 4;

  // 3. SATURATION: Calculate per-player saturation rates [0, 1]
  const saturationA0 = calculateOpponentSaturation(teamA[0]);
  const saturationA1 = calculateOpponentSaturation(teamA[1]);
  const saturationB0 = calculateOpponentSaturation(teamB[0]);
  const saturationB1 = calculateOpponentSaturation(teamB[1]);

  // Average of all 4 players' saturation rates
  const saturationFactor = (saturationA0 + saturationA1 + saturationB0 + saturationB1) / 4;

  // Hierarchical penalty: simple weighted sum of normalized factors
  // FREQUENCY (×OPPONENT_FREQUENCY_SCALE) > RECENCY (×OPPONENT_RECENCY_SCALE) > SATURATION (×OPPONENT_SATURATION_SCALE)
  return (frequencyFactor * OPPONENT_FREQUENCY_SCALE) +
    (recencyFactor * OPPONENT_RECENCY_SCALE) +
    (saturationFactor * OPPONENT_SATURATION_SCALE);
};

export const curriedMatchUpVarietyWeight = (currentRoundIndex: number) => {
  return (a: { entity: Team }, b: { entity: Team }): number => {
    // Calculate penalty for having faced each other before
    const penalty = calculateOpponentTeamPenalty(a.entity, b.entity, currentRoundIndex);

    // Return negative because we want to MAXIMIZE weight for good match-ups (minimize penalty)
    // The match() function handles normalization to [0,1] range automatically
    return -penalty;
  };
};

export const matchUpPerformanceWeight = (
  a: { rank: number },
  b: { rank: number },
): number => {
  return -(Math.abs(b.rank - a.rank));
};
