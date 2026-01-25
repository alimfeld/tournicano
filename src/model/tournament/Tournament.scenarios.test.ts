import { expect } from "vitest";
import { test } from "./TestHelpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";
import { Tournament, ParticipatingPlayer } from "./Tournament.ts";
import { Americano, AmericanoMixed, MatchingSpec } from "../matching/MatchingSpec.ts";

// ===== HELPER FUNCTIONS =====

// Helper: Calculate variance of a numeric array
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

// Helper: Calculate coefficient of variation (CV) - normalized variance
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return 0;
  return Math.sqrt(calculateVariance(values)) / mean;
}

// Helper: Analyze partner distribution for a set of players
interface DistributionAnalysis {
  partnerCounts: Map<string, number>;
  uniqueRate: number;
  maxRepeats: number;
  variance: number;
  cv: number;
  avgPartnershipsPerPair: number;
}

function analyzeDistribution(players: ParticipatingPlayer[]): DistributionAnalysis {
  const partnerCounts = new Map<string, number>();

  // Collect all partner counts
  players.forEach(p => {
    p.partners.forEach((rounds, partnerId) => {
      const pairKey = [p.id, partnerId].sort().join("-");
      partnerCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(partnerCounts.values());
  const uniqueCount = counts.filter(c => c === 1).length;
  const uniqueRate = counts.length > 0 ? uniqueCount / counts.length : 0;
  const maxRepeats = counts.length > 0 ? Math.max(...counts) : 0;
  const variance = calculateVariance(counts);
  const cv = calculateCV(counts);
  const avgPartnershipsPerPair = counts.length > 0
    ? counts.reduce((sum, c) => sum + c, 0) / counts.length
    : 0;

  return {
    partnerCounts,
    uniqueRate,
    maxRepeats,
    variance,
    cv,
    avgPartnershipsPerPair,
  };
}

// Helper: Analyze opponent distribution for a set of players
interface OpponentDistributionAnalysis {
  opponentCounts: Map<string, number>;
  minOpponents: number;
  maxOpponents: number;
  avgOpponents: number;
  range: number;
  cv: number;
}

function analyzeOpponentDistribution(players: ParticipatingPlayer[]): OpponentDistributionAnalysis {
  const opponentCounts = new Map<string, number>();

  // Collect all opponent counts
  players.forEach(p => {
    p.opponents.forEach((rounds, opponentId) => {
      const pairKey = [p.id, opponentId].sort().join("-");
      opponentCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(opponentCounts.values());
  const minOpponents = counts.length > 0 ? Math.min(...counts) : 0;
  const maxOpponents = counts.length > 0 ? Math.max(...counts) : 0;
  const avgOpponents = counts.length > 0
    ? counts.reduce((sum, c) => sum + c, 0) / counts.length
    : 0;
  const range = maxOpponents - minOpponents;
  const cv = calculateCV(counts);

  return {
    opponentCounts,
    minOpponents,
    maxOpponents,
    avgOpponents,
    range,
    cv,
  };
}

// ===== TOURNAMENT SCENARIO INFRASTRUCTURE =====

// Tournament scenario interface for parametrized distribution testing
interface TournamentScenario {
  name: string;
  playerCount: number;
  matchingSpec: MatchingSpec;
  courts: number;
  rounds: number;
  runsToTest: number;
  groupSizes?: number[]; // For mixed: [3,3], [4,5], etc.

  partner: {
    minUniqueRate: number;  // 0.70-1.0
    maxRepeats: number;     // 1-3
    maxCV: number;          // 0-0.45
  };

  opponent: {
    maxRange: number;       // 6-10
    maxCV: number;          // 0.25-0.60
  };

  backToBack?: {           // Mixed only
    maxPartnerRate: number;  // 0.07-0.15
    maxMatchupRate: number;  // 0.01-0.02
  };

  category: 'ideal' | 'near-ideal' | 'constrained' | 'mixed-balanced' | 'mixed-unbalanced';
  notes?: string;
}

// Helper: Create tournament with players and optional group assignment
function createTournament(count: number, groupSizes?: number[]): Tournament {
  const tournament = tournamentFactory.create();

  // Generate player names
  const names = Array.from({ length: count }, (_, i) => `P${i}`);
  tournament.addPlayers(names);

  // Assign groups if specified (for Mixed scenarios)
  if (groupSizes) {
    const players = tournament.players();
    let playerIndex = 0;
    groupSizes.forEach((size, groupIndex) => {
      for (let i = 0; i < size; i++) {
        players[playerIndex].setGroup(groupIndex, false); // no notify
        playerIndex++;
      }
    });
  }

  return tournament;
}

// Helper: Run scenario rounds and return participating players
function runScenario(
  tournament: Tournament,
  spec: MatchingSpec,
  rounds: number,
  courts: number
): ParticipatingPlayer[] {
  // Run all rounds
  for (let i = 0; i < rounds; i++) {
    tournament.createRound(spec, courts);
  }

  // Return participating players from final round
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  return lastRound.getParticipatingPlayers();
}

// Helper: Check for back-to-back partnerships and matchups
interface BackToBackAnalysis {
  partnerRate: number;
  matchupRate: number;
  totalPartnerships: number;
  backToBackPartnerships: number;
  totalMatchups: number;
  backToBackMatchups: number;
}

function checkBackToBack(
  tournament: Tournament,
  spec: MatchingSpec,
  rounds: number,
  courts: number
): BackToBackAnalysis {
  let totalPartnerships = 0;
  let backToBackPartnerships = 0;
  let totalMatchups = 0;
  let backToBackMatchups = 0;

  let prevRoundPartnerships: Set<string> = new Set();
  let prevRoundMatchups: Set<string> = new Set();

  for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
    const round = tournament.createRound(spec, courts);

    const currentPartnerships = new Set<string>();
    const currentMatchups = new Set<string>();

    round.matches.forEach(match => {
      // Track partnerships from Team objects
      const team1Key = [match.teamA.player1.id, match.teamA.player2.id].sort().join('-');
      const team2Key = [match.teamB.player1.id, match.teamB.player2.id].sort().join('-');

      currentPartnerships.add(team1Key);
      currentPartnerships.add(team2Key);
      totalPartnerships += 2;

      if (roundIndex > 0) {
        if (prevRoundPartnerships.has(team1Key)) backToBackPartnerships++;
        if (prevRoundPartnerships.has(team2Key)) backToBackPartnerships++;
      }

      // Track matchup (all 4 players)
      const matchupKey = [
        match.teamA.player1.id,
        match.teamA.player2.id,
        match.teamB.player1.id,
        match.teamB.player2.id
      ].sort().join('-');

      currentMatchups.add(matchupKey);
      totalMatchups++;

      if (roundIndex > 0 && prevRoundMatchups.has(matchupKey)) {
        backToBackMatchups++;
      }
    });

    prevRoundPartnerships = currentPartnerships;
    prevRoundMatchups = currentMatchups;
  }

  return {
    partnerRate: totalPartnerships > 0 ? backToBackPartnerships / totalPartnerships : 0,
    matchupRate: totalMatchups > 0 ? backToBackMatchups / totalMatchups : 0,
    totalPartnerships,
    backToBackPartnerships,
    totalMatchups,
    backToBackMatchups,
  };
}

// ===== SCENARIO DEFINITIONS =====

// Note: Partner distribution expectations were tightened based on improved
// performance from hierarchical penalty scaling in WeightFunctions.ts
// (frequency 100x > recency 10x > saturation 1x). This especially benefits
// odd-player scenarios which now achieve near-perfect distributions.

// Americano scenarios: 6-20 players
const americanoScenarios: TournamentScenario[] = [
  {
    name: "6p Americano",
    playerCount: 6,
    matchingSpec: Americano,
    courts: 1,
    rounds: 5,
    runsToTest: 20,
    category: 'near-ideal',
    partner: { minUniqueRate: 1.0, maxRepeats: 1, maxCV: 0.001 },
    opponent: { maxRange: 7, maxCV: 0.65 },
    notes: "10 slots, 15 pairs → some repeats inevitable"
  },
  {
    name: "7p Americano",
    playerCount: 7,
    matchingSpec: Americano,
    courts: 1,
    rounds: 7,
    runsToTest: 25,
    category: 'constrained',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.12 },
    opponent: { maxRange: 9, maxCV: 0.50 },
    notes: "14 slots, 21 pairs, odd player constraint"
  },
  {
    name: "8p Americano",
    playerCount: 8,
    matchingSpec: Americano,
    courts: 2,
    rounds: 7,
    runsToTest: 15,
    category: 'ideal',
    partner: { minUniqueRate: 1.0, maxRepeats: 1, maxCV: 0.001 },
    opponent: { maxRange: 3, maxCV: 0.26 },
    notes: "28 slots = C(8,2) → perfect distribution"
  },
  {
    name: "9p Americano",
    playerCount: 9,
    matchingSpec: Americano,
    courts: 2,
    rounds: 8,
    runsToTest: 25,
    category: 'constrained',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.10 },
    opponent: { maxRange: 9, maxCV: 0.50 },
    notes: "32 slots, 36 pairs, odd player constraint"
  },
  {
    name: "10p Americano",
    playerCount: 10,
    matchingSpec: Americano,
    courts: 2,
    rounds: 9,
    runsToTest: 20,
    category: 'near-ideal',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.04 },
    opponent: { maxRange: 8, maxCV: 0.45 },
    notes: "36 slots, 45 pairs"
  },
  {
    name: "11p Americano",
    playerCount: 11,
    matchingSpec: Americano,
    courts: 2,
    rounds: 10,
    runsToTest: 25,
    category: 'constrained',
    partner: { minUniqueRate: 0.99, maxRepeats: 2, maxCV: 0.02 },
    opponent: { maxRange: 9, maxCV: 0.52 },
    notes: "40 slots, 55 pairs, odd player constraint"
  },
  {
    name: "12p Americano",
    playerCount: 12,
    matchingSpec: Americano,
    courts: 3,
    rounds: 11,
    runsToTest: 15,
    category: 'ideal',
    partner: { minUniqueRate: 1.0, maxRepeats: 1, maxCV: 0.001 },
    opponent: { maxRange: 7, maxCV: 0.42 },
    notes: "66 slots = C(12,2) → perfect distribution"
  },
  {
    name: "13p Americano",
    playerCount: 13,
    matchingSpec: Americano,
    courts: 3,
    rounds: 12,
    runsToTest: 25,
    category: 'constrained',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.08 },
    opponent: { maxRange: 10, maxCV: 0.53 },
    notes: "72 slots, 78 pairs, odd player constraint"
  },
  {
    name: "14p Americano",
    playerCount: 14,
    matchingSpec: Americano,
    courts: 3,
    rounds: 13,
    runsToTest: 20,
    category: 'near-ideal',
    partner: { minUniqueRate: 0.99, maxRepeats: 2, maxCV: 0.04 },
    opponent: { maxRange: 8, maxCV: 0.42 },
    notes: "78 slots, 91 pairs"
  },
  {
    name: "15p Americano",
    playerCount: 15,
    matchingSpec: Americano,
    courts: 3,
    rounds: 14,
    runsToTest: 25,
    category: 'constrained',
    partner: { minUniqueRate: 0.99, maxRepeats: 2, maxCV: 0.01 },
    opponent: { maxRange: 10, maxCV: 0.54 },
    notes: "84 slots, 105 pairs, odd player constraint"
  },
  {
    name: "16p Americano",
    playerCount: 16,
    matchingSpec: Americano,
    courts: 4,
    rounds: 15,
    runsToTest: 12,
    category: 'ideal',
    partner: { minUniqueRate: 1.0, maxRepeats: 1, maxCV: 0.001 },
    opponent: { maxRange: 8, maxCV: 0.42 },
    notes: "120 slots = C(16,2) → perfect distribution"
  },
  {
    name: "17p Americano",
    playerCount: 17,
    matchingSpec: Americano,
    courts: 4,
    rounds: 16,
    runsToTest: 20,
    category: 'constrained',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.08 },
    opponent: { maxRange: 10, maxCV: 0.55 },
    notes: "128 slots, 136 pairs, odd player constraint"
  },
  {
    name: "18p Americano",
    playerCount: 18,
    matchingSpec: Americano,
    courts: 4,
    rounds: 17,
    runsToTest: 15,
    category: 'near-ideal',
    partner: { minUniqueRate: 0.95, maxRepeats: 2, maxCV: 0.03 },
    opponent: { maxRange: 9, maxCV: 0.41 },
    notes: "136 slots, 153 pairs"
  },
  {
    name: "19p Americano",
    playerCount: 19,
    matchingSpec: Americano,
    courts: 4,
    rounds: 18,
    runsToTest: 20,
    category: 'constrained',
    partner: { minUniqueRate: 0.99, maxRepeats: 2, maxCV: 0.01 },
    opponent: { maxRange: 10, maxCV: 0.55 },
    notes: "144 slots, 171 pairs, odd player constraint"
  },
  {
    name: "20p Americano",
    playerCount: 20,
    matchingSpec: Americano,
    courts: 5,
    rounds: 19,
    runsToTest: 12,
    category: 'ideal',
    partner: { minUniqueRate: 0.98, maxRepeats: 2, maxCV: 0.11 },
    opponent: { maxRange: 9, maxCV: 0.38 },
    notes: "190 slots = C(20,2) → perfect distribution"
  },
];

// AmericanoMixed scenarios: 6-20 players with balanced group splits
const mixedScenarios: TournamentScenario[] = [
  {
    name: "6p Mixed [3,3]",
    playerCount: 6,
    matchingSpec: AmericanoMixed,
    courts: 1,
    rounds: 5,
    runsToTest: 20,
    groupSizes: [3, 3],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.76, maxRepeats: 2, maxCV: 0.31 },
    opponent: { maxRange: 8, maxCV: 0.40 },
    backToBack: { maxPartnerRate: 0.09, maxMatchupRate: 0.01 },
    notes: "9 valid mixed pairs (3×3)"
  },
  {
    name: "7p Mixed [3,4]",
    playerCount: 7,
    matchingSpec: AmericanoMixed,
    courts: 1,
    rounds: 7,
    runsToTest: 25,
    groupSizes: [3, 4],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.85, maxRepeats: 2, maxCV: 0.21 },
    opponent: { maxRange: 9, maxCV: 0.65 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "12 valid mixed pairs (3×4), unbalanced groups + odd total"
  },
  {
    name: "8p Mixed [4,4]",
    playerCount: 8,
    matchingSpec: AmericanoMixed,
    courts: 2,
    rounds: 7,
    runsToTest: 20,
    groupSizes: [4, 4],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.20, maxRepeats: 2, maxCV: 0.30 },
    opponent: { maxRange: 8, maxCV: 0.40 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "16 valid mixed pairs (4×4)"
  },
  {
    name: "9p Mixed [4,5]",
    playerCount: 9,
    matchingSpec: AmericanoMixed,
    courts: 2,
    rounds: 8,
    runsToTest: 25,
    groupSizes: [4, 5],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.60, maxRepeats: 2, maxCV: 0.36 },
    opponent: { maxRange: 9, maxCV: 0.55 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "20 valid mixed pairs (4×5), unbalanced groups + odd total"
  },
  {
    name: "10p Mixed [5,5]",
    playerCount: 10,
    matchingSpec: AmericanoMixed,
    courts: 2,
    rounds: 9,
    runsToTest: 20,
    groupSizes: [5, 5],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.50, maxRepeats: 2, maxCV: 0.36 },
    opponent: { maxRange: 8, maxCV: 0.43 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "25 valid mixed pairs (5×5)"
  },
  {
    name: "11p Mixed [5,6]",
    playerCount: 11,
    matchingSpec: AmericanoMixed,
    courts: 2,
    rounds: 10,
    runsToTest: 25,
    groupSizes: [5, 6],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.70, maxRepeats: 3, maxCV: 0.45 },
    opponent: { maxRange: 10, maxCV: 0.57 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "30 valid mixed pairs (5×6), unbalanced groups + odd total"
  },
  {
    name: "12p Mixed [6,6]",
    playerCount: 12,
    matchingSpec: AmericanoMixed,
    courts: 3,
    rounds: 11,
    runsToTest: 15,
    groupSizes: [6, 6],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.15, maxRepeats: 2, maxCV: 0.22 },
    opponent: { maxRange: 8, maxCV: 0.42 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "36 valid mixed pairs (6×6)"
  },
  {
    name: "13p Mixed [6,7]",
    playerCount: 13,
    matchingSpec: AmericanoMixed,
    courts: 3,
    rounds: 12,
    runsToTest: 20,
    groupSizes: [6, 7],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.40, maxRepeats: 2, maxCV: 0.35 },
    opponent: { maxRange: 10, maxCV: 0.58 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "42 valid mixed pairs (6×7), unbalanced groups + odd total"
  },
  {
    name: "14p Mixed [7,7]",
    playerCount: 14,
    matchingSpec: AmericanoMixed,
    courts: 3,
    rounds: 13,
    runsToTest: 15,
    groupSizes: [7, 7],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.35, maxRepeats: 2, maxCV: 0.32 },
    opponent: { maxRange: 9, maxCV: 0.42 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "49 valid mixed pairs (7×7)"
  },
  {
    name: "15p Mixed [7,8]",
    playerCount: 15,
    matchingSpec: AmericanoMixed,
    courts: 3,
    rounds: 14,
    runsToTest: 20,
    groupSizes: [7, 8],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.60, maxRepeats: 2, maxCV: 0.38 },
    opponent: { maxRange: 10, maxCV: 0.45 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "56 valid mixed pairs (7×8), unbalanced groups + odd total"
  },
  {
    name: "16p Mixed [8,8]",
    playerCount: 16,
    matchingSpec: AmericanoMixed,
    courts: 4,
    rounds: 15,
    runsToTest: 12,
    groupSizes: [8, 8],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.10, maxRepeats: 2, maxCV: 0.20 },
    opponent: { maxRange: 9, maxCV: 0.43 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "64 valid mixed pairs (8×8)"
  },
  {
    name: "17p Mixed [8,9]",
    playerCount: 17,
    matchingSpec: AmericanoMixed,
    courts: 4,
    rounds: 16,
    runsToTest: 15,
    groupSizes: [8, 9],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.35, maxRepeats: 2, maxCV: 0.32 },
    opponent: { maxRange: 10, maxCV: 0.58 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "72 valid mixed pairs (8×9), unbalanced groups + odd total"
  },
  {
    name: "18p Mixed [9,9]",
    playerCount: 18,
    matchingSpec: AmericanoMixed,
    courts: 4,
    rounds: 17,
    runsToTest: 12,
    groupSizes: [9, 9],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.30, maxRepeats: 2, maxCV: 0.29 },
    opponent: { maxRange: 9, maxCV: 0.43 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "81 valid mixed pairs (9×9)"
  },
  {
    name: "19p Mixed [9,10]",
    playerCount: 19,
    matchingSpec: AmericanoMixed,
    courts: 4,
    rounds: 18,
    runsToTest: 15,
    groupSizes: [9, 10],
    category: 'mixed-unbalanced',
    partner: { minUniqueRate: 0.45, maxRepeats: 2, maxCV: 0.35 },
    opponent: { maxRange: 10, maxCV: 0.58 },
    backToBack: { maxPartnerRate: 0.15, maxMatchupRate: 0.02 },
    notes: "90 valid mixed pairs (9×10), unbalanced groups + odd total"
  },
  {
    name: "20p Mixed [10,10]",
    playerCount: 20,
    matchingSpec: AmericanoMixed,
    courts: 5,
    rounds: 19,
    runsToTest: 10,
    groupSizes: [10, 10],
    category: 'mixed-balanced',
    partner: { minUniqueRate: 0.08, maxRepeats: 2, maxCV: 0.17 },
    opponent: { maxRange: 9, maxCV: 0.43 },
    backToBack: { maxPartnerRate: 0.07, maxMatchupRate: 0.01 },
    notes: "100 valid mixed pairs (10×10)"
  },
];

// ===== PARAMETRIZED DISTRIBUTION TESTS =====

// Americano Partner Distribution Tests
americanoScenarios.forEach((scenario) => {
  test(`${scenario.name} - Partner Distribution (${scenario.runsToTest} runs)`, () => {
    const allAnalyses: DistributionAnalysis[] = [];

    for (let run = 0; run < scenario.runsToTest; run++) {
      // Create tournament with players
      const tournament = createTournament(scenario.playerCount);

      // Run scenario and get players
      const players = runScenario(
        tournament,
        scenario.matchingSpec,
        scenario.rounds,
        scenario.courts
      );

      // Analyze distribution
      const analysis = analyzeDistribution(players);
      allAnalyses.push(analysis);
    }

    // Aggregate statistics
    const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / scenario.runsToTest;
    const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / scenario.runsToTest;
    const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
    const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / scenario.runsToTest;

    console.log(`\n=== ${scenario.name.toUpperCase()} - PARTNER DISTRIBUTION ===`);
    console.log(`Category: ${scenario.category}`);
    console.log(`Configuration: ${scenario.playerCount}p, ${scenario.rounds} rounds, ${scenario.courts} courts`);
    console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
    console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
    console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
    console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);
    if (scenario.notes) console.log(`Notes: ${scenario.notes}`);

    // Assertions
    expect(avgUniqueRate).toBeGreaterThanOrEqual(scenario.partner.minUniqueRate);
    expect(maxRepeatsOverall).toBeLessThanOrEqual(scenario.partner.maxRepeats);
    expect(avgCV).toBeLessThan(scenario.partner.maxCV);
  });
});

// Americano Opponent Distribution Tests
americanoScenarios.forEach((scenario) => {
  test(`${scenario.name} - Opponent Distribution (${scenario.runsToTest} runs)`, () => {
    const allAnalyses: OpponentDistributionAnalysis[] = [];

    for (let run = 0; run < scenario.runsToTest; run++) {
      // Create tournament with players
      const tournament = createTournament(scenario.playerCount);

      // Run scenario and get players
      const players = runScenario(
        tournament,
        scenario.matchingSpec,
        scenario.rounds,
        scenario.courts
      );

      // Analyze distribution
      const analysis = analyzeOpponentDistribution(players);
      allAnalyses.push(analysis);
    }

    // Aggregate statistics
    const avgRange = allAnalyses.reduce((sum, a) => sum + a.range, 0) / scenario.runsToTest;
    const maxRange = Math.max(...allAnalyses.map(a => a.range));
    const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / scenario.runsToTest;
    const avgMinOpponents = allAnalyses.reduce((sum, a) => sum + a.minOpponents, 0) / scenario.runsToTest;
    const avgMaxOpponents = allAnalyses.reduce((sum, a) => sum + a.maxOpponents, 0) / scenario.runsToTest;

    console.log(`\n=== ${scenario.name.toUpperCase()} - OPPONENT DISTRIBUTION ===`);
    console.log(`Average range (max-min): ${avgRange.toFixed(2)}`);
    console.log(`Max range across all runs: ${maxRange}`);
    console.log(`Average min opponents: ${avgMinOpponents.toFixed(2)}`);
    console.log(`Average max opponents: ${avgMaxOpponents.toFixed(2)}`);
    console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

    // Assertions
    expect(maxRange).toBeLessThanOrEqual(scenario.opponent.maxRange);
    expect(avgCV).toBeLessThan(scenario.opponent.maxCV);
  });
});

// Mixed Partner Distribution Tests
mixedScenarios.forEach((scenario) => {
  test(`${scenario.name} - Partner Distribution (${scenario.runsToTest} runs)`, () => {
    const allAnalyses: DistributionAnalysis[] = [];

    for (let run = 0; run < scenario.runsToTest; run++) {
      // Create tournament with players and group assignment
      const tournament = createTournament(scenario.playerCount, scenario.groupSizes);

      // Run scenario and get players
      const players = runScenario(
        tournament,
        scenario.matchingSpec,
        scenario.rounds,
        scenario.courts
      );

      // Analyze distribution
      const analysis = analyzeDistribution(players);
      allAnalyses.push(analysis);
    }

    // Aggregate statistics
    const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / scenario.runsToTest;
    const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / scenario.runsToTest;
    const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
    const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / scenario.runsToTest;

    console.log(`\n=== ${scenario.name.toUpperCase()} - PARTNER DISTRIBUTION ===`);
    console.log(`Category: ${scenario.category}`);
    console.log(`Configuration: ${scenario.playerCount}p ${JSON.stringify(scenario.groupSizes)}, ${scenario.rounds} rounds, ${scenario.courts} courts`);
    console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
    console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
    console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
    console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);
    if (scenario.notes) console.log(`Notes: ${scenario.notes}`);

    // Assertions
    expect(avgUniqueRate).toBeGreaterThanOrEqual(scenario.partner.minUniqueRate);
    expect(maxRepeatsOverall).toBeLessThanOrEqual(scenario.partner.maxRepeats);
    expect(avgCV).toBeLessThan(scenario.partner.maxCV);
  });
});

// Mixed Opponent Distribution + Back-to-Back Tests
mixedScenarios.forEach((scenario) => {
  test(`${scenario.name} - Opponent Distribution & Back-to-Back (${scenario.runsToTest} runs)`, () => {
    const allOpponentAnalyses: OpponentDistributionAnalysis[] = [];
    const allBackToBackAnalyses: BackToBackAnalysis[] = [];

    for (let run = 0; run < scenario.runsToTest; run++) {
      // Test opponent distribution
      const tournament1 = createTournament(scenario.playerCount, scenario.groupSizes);
      const players1 = runScenario(tournament1, scenario.matchingSpec, scenario.rounds, scenario.courts);
      const opponentAnalysis = analyzeOpponentDistribution(players1);
      allOpponentAnalyses.push(opponentAnalysis);

      // Test back-to-back
      const tournament2 = createTournament(scenario.playerCount, scenario.groupSizes);
      const backToBackAnalysis = checkBackToBack(tournament2, scenario.matchingSpec, scenario.rounds, scenario.courts);
      allBackToBackAnalyses.push(backToBackAnalysis);
    }

    // Aggregate opponent statistics
    const avgRange = allOpponentAnalyses.reduce((sum, a) => sum + a.range, 0) / scenario.runsToTest;
    const maxRange = Math.max(...allOpponentAnalyses.map(a => a.range));
    const avgCV = allOpponentAnalyses.reduce((sum, a) => sum + a.cv, 0) / scenario.runsToTest;

    // Aggregate back-to-back statistics
    const avgPartnerRate = allBackToBackAnalyses.reduce((sum, a) => sum + a.partnerRate, 0) / scenario.runsToTest;
    const avgMatchupRate = allBackToBackAnalyses.reduce((sum, a) => sum + a.matchupRate, 0) / scenario.runsToTest;

    console.log(`\n=== ${scenario.name.toUpperCase()} - OPPONENT & BACK-TO-BACK ===`);
    console.log(`Opponent - Avg range: ${avgRange.toFixed(2)}, Max range: ${maxRange}, CV: ${avgCV.toFixed(3)}`);
    console.log(`Back-to-back - Partner rate: ${(avgPartnerRate * 100).toFixed(2)}%, Matchup rate: ${(avgMatchupRate * 100).toFixed(2)}%`);

    // Assertions - Opponent
    expect(maxRange).toBeLessThanOrEqual(scenario.opponent.maxRange);
    expect(avgCV).toBeLessThan(scenario.opponent.maxCV);

    // Assertions - Back-to-back
    if (scenario.backToBack) {
      expect(avgPartnerRate).toBeLessThan(scenario.backToBack.maxPartnerRate);
      expect(avgMatchupRate).toBeLessThan(scenario.backToBack.maxMatchupRate);
    }
  });
});
