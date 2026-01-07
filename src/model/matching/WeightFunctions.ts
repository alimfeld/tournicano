import { Player, Team } from "./Matching.ts";
import {
  TeamUpGroupMode,
  MatchUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";

// Constants
const MEXICANO_RANK_DIFF = 2; // In Mexicano mode, pair 1st with 3rd, 2nd with 4th (rank diff = 2)

// Scaling factors for penalty calculations
const PARTNER_FREQUENCY_SCALE = 5; // Partner frequency dominates over recency
const OPPONENT_WEIGHT_RATIO = 0.20; // Opponent penalty is 20% of partner penalty
const EXACT_TEAM_FREQUENCY_SCALE = 8; // Exact team matches are heavily penalized
const INDIVIDUAL_FREQUENCY_SCALE = 2; // Individual opponent encounters secondary weight

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
 * Calculates how "saturated" a player's partnership history is.
 * This measures how many times a player has repeated partnerships across their entire history.
 *
 * Example: If partnered with A(2x), B(1x), C(1x):
 *   (2-1) + (1-1) + (1-1) = 1 + 0 + 0 = 1
 *
 * Players with high saturation (many repeated partnerships) should be encouraged
 * to find new partners.
 */
const calculatePartnerSaturation = (player: Player): number => {
  const partnerCounts = Array.from(player.partners.values());
  return partnerCounts.reduce((acc, rounds) => acc + rounds.length - 1, 0);
};

/**
 * Calculates a penalty for two players having partnered together before.
 * Higher penalty = less desirable pairing.
 *
 * Uses round-based hierarchical scaling with repetition rate amplification:
 * 1. FREQUENCY (R×PARTNER_FREQUENCY_SCALE): How many times have they partnered? (dominates all)
 *    - Amplified by repetition rate: higher penalties when either player is new
 *    - This prevents newcomers from developing high repetition rates quickly
 * 2. RECENCY (R scale): How recently did they partner? (secondary tiebreaker)
 * 3. SATURATION (constant scale): Partner history variety (final tiebreaker)
 *
 * Where R = total rounds in the tournament (currentRoundIndex + 1). Using the
 * tournament-wide round count (rather than individual player history) ensures
 * symmetric penalties and consistent scaling across all pairings.
 *
 * The repetition rate amplifier = R / min(playerA.history, playerB.history)
 * increases penalties when either player has limited history, reflecting that
 * repetitions "hurt more" when fewer rounds have been played.
 *
 * Examples at Round 10 (R=10):
 * - Two veterans (10 rounds each), partnered 2x (last R9):
 *   Amplifier=1.0, penalty = 2×1.0×PARTNER_FREQUENCY_SCALE×10 + 10×10 + 2 = 202
 * - Two newcomers (3 rounds each), partnered 1x (last R9):
 *   Amplifier=3.33, penalty = 1×3.33×PARTNER_FREQUENCY_SCALE×10 + 10×10 + 2 = 278
 * - Newcomer (3) + veteran (10), partnered 1x (last R9):
 *   Amplifier=3.33, penalty = 1×3.33×PARTNER_FREQUENCY_SCALE×10 + 10×10 + 2 = 278
 * - Veterans, never partnered: 0
 *
 * Note: Back-to-back repetitions (consecutive rounds) are handled naturally by
 * recency, but are not strictly prevented. Frequency always dominates: partnering
 * 2x always has higher penalty than 1x, regardless of when or player history.
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

  // Use tournament-wide round count for consistent, symmetric scaling
  const totalRounds = currentRoundIndex + 1;

  // Calculate each player's participation history (for repetition rate amplification)
  const totalRoundsA = Math.max(1, playerA.matchCount + playerA.pauseCount);
  const totalRoundsB = Math.max(1, playerB.matchCount + playerB.pauseCount);
  const minParticipation = Math.min(totalRoundsA, totalRoundsB);

  // 1. FREQUENCY: How many times have they partnered? (R×5 scale - dominates everything)
  //    Amplified by repetition rate: penalties increase when either player has limited history
  const baseFrequency = roundsTeamedUp.length;
  const repetitionAmplifier = totalRounds / minParticipation;
  const frequencyFactor = baseFrequency * repetitionAmplifier;

  // 2. RECENCY: How recently did they partner? (R scale - secondary tiebreaker)
  const lastRoundIndex = roundsTeamedUp[roundsTeamedUp.length - 1]!;
  const recencyFactor = lastRoundIndex + 1; // 1-indexed for weight

  // 3. SATURATION: Partner history saturation for both players (constant scale - final tiebreaker)
  const saturationFactorA = calculatePartnerSaturation(playerA);
  const saturationFactorB = calculatePartnerSaturation(playerB);

  // Hierarchical penalty: linear scaling with clear separation
  // Frequency (R×PARTNER_FREQUENCY_SCALE) > Recency (R×1) > Saturation (1)
  return (frequencyFactor * PARTNER_FREQUENCY_SCALE * totalRounds) +
    (recencyFactor * totalRounds) +
    (saturationFactorA + saturationFactorB);
};

/**
 * Calculates a penalty for two players having been opponents before.
 * Uses the same hierarchical structure as partner penalty but scaled by OPPONENT_WEIGHT_RATIO.
 * 
 * This ensures opponent history scales consistently with tournament growth and protects
 * newcomers from developing high opponent repetition rates.
 */
const calculateOpponentPenalty = (
  playerA: Player,
  playerB: Player,
  currentRoundIndex: number,
): number => {
  const roundsOpposed = playerA.opponents.get(playerB.id) || [];

  if (roundsOpposed.length === 0) {
    return 0;
  }

  // Use tournament-wide round count for consistent, symmetric scaling
  const totalRounds = currentRoundIndex + 1;

  // Calculate each player's participation history (for repetition rate amplification)
  const totalRoundsA = Math.max(1, playerA.matchCount + playerA.pauseCount);
  const totalRoundsB = Math.max(1, playerB.matchCount + playerB.pauseCount);
  const minParticipation = Math.min(totalRoundsA, totalRoundsB);

  // FREQUENCY: How many times have they been opponents? (with amplification)
  const baseFrequency = roundsOpposed.length;
  const repetitionAmplifier = totalRounds / minParticipation;
  const frequencyFactor = baseFrequency * repetitionAmplifier;

  // RECENCY: How recently did they face each other?
  const lastRoundIndex = roundsOpposed.at(-1)!;
  const recencyFactor = lastRoundIndex + 1; // 1-indexed for weight

  // Hierarchical penalty matching partner structure but scaled by OPPONENT_WEIGHT_RATIO
  // Frequency (R×PARTNER_FREQUENCY_SCALE) > Recency (R×1), then scaled to 20%
  return ((frequencyFactor * PARTNER_FREQUENCY_SCALE * totalRounds) +
    (recencyFactor * totalRounds)) * OPPONENT_WEIGHT_RATIO;
};

export const curriedTeamUpVarietyWeight = (currentRoundIndex: number) => {
  return (a: { entity: Player }, b: { entity: Player }): number => {
    // Calculate penalty for having partnered before
    const partnerPenalty = calculatePartnerPenalty(a.entity, b.entity, currentRoundIndex);

    // Calculate penalty for having been opponents before (OPPONENT_WEIGHT_RATIO of partner penalty)
    const opponentPenalty = calculateOpponentPenalty(a.entity, b.entity, currentRoundIndex);

    // Return negative because we want to MAXIMIZE weight for good pairings (minimize penalty)
    // The match() function handles normalization to [0,1] range automatically
    return -(partnerPenalty + opponentPenalty);
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
 * Calculates a penalty for two teams having played against each other before.
 * Higher penalty = less desirable match-up.
 *
 * Uses round-based hierarchical scaling with repetition rate amplification:
 * 1. EXACT_TEAM_FREQUENCY (R×EXACT_TEAM_FREQUENCY_SCALE): Exact same teams faced each other (dominates all)
 * 2. INDIVIDUAL_FREQUENCY (R×INDIVIDUAL_FREQUENCY_SCALE): Players faced each other in any combination (secondary)
 * 3. RECENCY (R scale): How recently encounters happened (tiebreaker)
 * 4. REPETITION RATE AMPLIFICATION: Frequencies amplified for matches involving newcomers
 *
 * Where R = total rounds in the tournament (currentRoundIndex + 1). Using the
 * tournament-wide round count ensures consistent scaling across all match-ups.
 *
 * Repetition rate amplification protects newcomers from developing high repetition rates:
 * - Amplifier = totalRounds / minParticipation (of all 4 players)
 * - Applied to exact team and individual frequencies (but not recency)
 * - Philosophy: "Repetitions hurt more when fewer rounds have been played"
 *
 * Examples at Round 10 (R=10):
 * - Teams never faced: 0
 * - All veterans (10 rounds each), faced 1× exact (Round 9):
 *   amplifier=1.0, penalty = 1×1.0×EXACT_TEAM_FREQUENCY_SCALE×10 + 4×1.0×INDIVIDUAL_FREQUENCY_SCALE×10 + 10 = 170
 * - One newcomer (3 rounds), faced 1× exact (Round 9):
 *   amplifier=3.33, penalty = 1×3.33×EXACT_TEAM_FREQUENCY_SCALE×10 + 4×3.33×INDIVIDUAL_FREQUENCY_SCALE×10 + 10 = 543
 * - All veterans, faced 2× exact:
 *   amplifier=1.0, penalty = 2×1.0×EXACT_TEAM_FREQUENCY_SCALE×10 + 8×1.0×INDIVIDUAL_FREQUENCY_SCALE×10 + 10 = 330
 *
 * The exact team match-ups are weighted higher (EXACT_TEAM_FREQUENCY_SCALE×) than individual 
 * encounters (INDIVIDUAL_FREQUENCY_SCALE×), ensuring that repeating the exact same match-up is 
 * heavily penalized. In a typical exact team match (1 exact team = 4 individual encounters), the 
 * contributions are balanced: exact contributes EXACT_TEAM_FREQUENCY_SCALE×R, individual 
 * contributes EXACT_TEAM_FREQUENCY_SCALE×R (4×INDIVIDUAL_FREQUENCY_SCALE×R).
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

  // 1. INDIVIDUAL_FREQUENCY: Total count of individual opponent encounters
  const individualFrequency =
    a0b0Rounds.length + a0b1Rounds.length + a1b0Rounds.length + a1b1Rounds.length;

  if (individualFrequency === 0) {
    return 0; // Never faced each other - no penalty
  }

  // 2. EXACT_TEAM_FREQUENCY: Detect when exact same teams faced each other
  // An exact team match occurs when all 4 player combinations faced each other in the same round
  const exactTeamRounds = a0b0Rounds.filter(round =>
    a0b1Rounds.includes(round) &&
    a1b0Rounds.includes(round) &&
    a1b1Rounds.includes(round)
  );

  const exactTeamFrequency = exactTeamRounds.length;

  // 3. RECENCY: When did encounters happen?
  const totalRounds = currentRoundIndex + 1;

  // Individual recency: most recent encounter for each player combination
  const individualRecency = Math.max(
    a0b0Rounds.at(-1) ?? -1,
    a0b1Rounds.at(-1) ?? -1,
    a1b0Rounds.at(-1) ?? -1,
    a1b1Rounds.at(-1) ?? -1
  ) + 1; // Convert to 1-indexed

  // Exact team recency: when did exact teams last face?
  const exactTeamRecency = exactTeamRounds.length > 0
    ? Math.max(...exactTeamRounds) + 1
    : 0;

  // Use the more recent of the two (exact team or individual)
  const recencyFactor = Math.max(exactTeamRecency, individualRecency);

  // 4. REPETITION RATE AMPLIFICATION: Protect newcomers from high repetition rates
  // Calculate minimum participation across all 4 players in this match
  const minParticipation = Math.min(
    Math.max(1, teamA[0].matchCount + teamA[0].pauseCount),
    Math.max(1, teamA[1].matchCount + teamA[1].pauseCount),
    Math.max(1, teamB[0].matchCount + teamB[0].pauseCount),
    Math.max(1, teamB[1].matchCount + teamB[1].pauseCount)
  );

  // Amplifier increases penalties when any player has limited history
  // Philosophy: "Repetitions hurt more when fewer rounds have been played"
  const amplifier = totalRounds / minParticipation;

  // Apply amplification to frequencies (but not recency - consistent with partner penalty)
  const amplifiedExactFrequency = exactTeamFrequency * amplifier;
  const amplifiedIndividualFrequency = individualFrequency * amplifier;

  // Hierarchical penalty: linear scaling with clear separation
  // EXACT_TEAM (R×EXACT_TEAM_FREQUENCY_SCALE) > INDIVIDUAL (R×INDIVIDUAL_FREQUENCY_SCALE) > RECENCY (R×1)
  return (amplifiedExactFrequency * EXACT_TEAM_FREQUENCY_SCALE * totalRounds) +
    (amplifiedIndividualFrequency * INDIVIDUAL_FREQUENCY_SCALE * totalRounds) +
    (recencyFactor * totalRounds);
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
